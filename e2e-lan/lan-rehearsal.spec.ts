import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { platformData } from '../src/screens/line-map/model'
import { findTrainingScenarioDefinition } from '../src/trainingScenarios'

// LAN rehearsal against the production build on the bundled server: one trainer
// and two trainees, each in their own browser profile (as on separate PCs),
// running both exercises at once from sign-in to history. The on-site check with
// real PCs is docs/lan-test-checklist.md. Exercise 1 runs in Practice (with the
// training aids) and Exercise 2 in Assessment (none).

const PASSWORD = 'lan-rehearsal-1'
const TRAINER = { name: 'Lan Trainer', username: 'lan.trainer' }
const TRAINEES = [
  { name: 'Amir Hassan', username: 'amir' },
  { name: 'Bea Ong', username: 'bea' },
]
const TOKEN_KEY = 'occ.auth.token.v1'

function watchErrors(context: BrowserContext, errors: string[]) {
  const watch = (page: Page) => {
    page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`${page.url()}: ${message.text()}`)
      }
    })
  }

  context.pages().forEach(watch)
  context.on('page', watch)
}

async function signIn(page: Page, username: string) {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('one trainer and two trainees run separate exercises on the LAN build', async ({ browser, request }) => {
  const errors: string[] = []

  // The host is new: the first trainer is set up, then the trainees are added.
  const setup = await request.post('/api/auth/setup', { data: { ...TRAINER, password: PASSWORD } })

  expect(setup.status()).toBe(201)

  const adminToken = (await setup.json() as { token: string }).token

  for (const trainee of TRAINEES) {
    const created = await request.post('/api/users', {
      data: { ...trainee, password: PASSWORD, role: 'trainee' },
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(created.status()).toBe(201)
  }

  // Trainer PC: sign in, open Exercise 2.
  const trainerPc = await browser.newContext()

  watchErrors(trainerPc, errors)

  const consolePage = await trainerPc.newPage()

  await signIn(consolePage, TRAINER.username)
  await expect(consolePage).toHaveURL(/\/ios\/modules$/)
  await consolePage.getByRole('button', { name: 'Add Exercise 2' }).click()

  const exercises = [1, 2].map((number) => consolePage.getByRole('region', { name: `Exercise ${number}` }))
  // One exercise shows at a time: bring one to the front by its tab.
  const show = (index: number) => consolePage.getByRole('tab', { name: new RegExp(`Exercise ${index + 1}`) }).click()
  const codes: string[] = []

  for (const [index, exercise] of exercises.entries()) {
    await show(index)

    const code = exercise.locator('.trainer-console-code')

    await expect(code).toHaveText(/^[A-Z2-9]{4}$/)
    codes.push((await code.textContent())!.trim())
  }

  expect(codes[0]).not.toBe(codes[1])

  // Trainee PCs: sign in, join with their exercise's code, open the three monitors.
  const trainees = []

  for (const [index, trainee] of TRAINEES.entries()) {
    const pc = await browser.newContext()

    watchErrors(pc, errors)

    const lobby = await pc.newPage()

    await signIn(lobby, trainee.username)
    await expect(lobby).toHaveURL(/\/session\/join$/)
    await lobby.getByLabel('Session code').fill(codes[index])
    await lobby.getByRole('button', { name: 'Join session' }).click()
    await expect(lobby.getByRole('status')).toContainText('Waiting for trainer')
    await expect(lobby.locator('.trainee-facts')).toContainText(codes[index])

    await lobby.getByRole('button', { name: 'Open my monitors' }).click()
    await expect.poll(() => pc.pages().length).toBe(4)

    const monitor = (route: string) => pc.pages().find((page) => page.url().includes(route))!

    await expect.poll(() => Boolean(monitor('/screen/alarms') && monitor('/screen/line-map') && monitor('/screen/timetable'))).toBe(true)

    const token = await lobby.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY)

    trainees.push({
      ...trainee,
      alarms: monitor('/screen/alarms'),
      lineMap: monitor('/screen/line-map'),
      lobby,
      pc,
      timetable: monitor('/screen/timetable'),
      token: token!,
    })
    await show(index)
    await expect(exercises[index].getByLabel('Session').getByText(trainee.name)).toBeVisible()
  }

  // The trainer loads the same incident into both exercises: Exercise 1 in
  // Practice, Exercise 2 in Assessment.
  await show(1)
  await exercises[1].getByRole('radiogroup', { name: 'Training mode' }).getByRole('radio', { name: 'Assessment' }).click()

  for (const [index, exercise] of exercises.entries()) {
    await show(index)
    await exercise.getByRole('radio', { name: /PSD Fault/ }).click()
    await exercise.getByRole('button', { name: 'Load scenario', exact: true }).click()
    await expect(exercise.getByRole('region', { name: 'Scenario status' }).getByText('RUNNING', { exact: true })).toBeVisible()
  }

  const definition = findTrainingScenarioDefinition('PSD_FAULT', 'PSD obstructed')
  const coach = (page: Page) => page.getByRole('complementary', { name: 'Practice coach' })
  const aidsSwitch = (index: number) => exercises[index].getByRole('button', { name: /^Aids (on|off)$/ })

  // Practice (trainee 1): the coach is on every monitor and helps on the Line Map.
  const practice = trainees[0]

  await show(0)
  await expect(aidsSwitch(0)).toHaveText('Aids on')

  for (const page of [practice.alarms, practice.lineMap, practice.timetable]) {
    await expect(coach(page)).toBeVisible()
  }

  await expect(coach(practice.lineMap)).toContainText('Next: Select affected train')
  await coach(practice.lineMap).locator('.training-coach-head').click()
  await coach(practice.lineMap).getByRole('button', { name: 'Show me' }).click()
  await expect(practice.lineMap.getByTestId('coach-highlight')).toHaveClass(/coach-highlight--outline/)
  await coach(practice.lineMap).getByRole('button', { name: /^Locate Train / }).click()
  await expect(practice.lineMap.getByTestId('coach-highlight')).toHaveClass(/coach-highlight--ring/)

  // A station panel with no train is refused, and the coach says so.
  const practiceSession = (await (await request.get('/api/session', { headers: { authorization: `Bearer ${practice.token}` } })).json()).session as {
    trains: Array<{ lineMapVisible?: boolean; x: number }>
  }
  const emptyStation = platformData.find((platform) => ['SKG', 'PGL', 'PGC'].includes(platform.code)
    && !practiceSession.trains.some((train) => train.lineMapVisible !== false && Math.abs(train.x - platform.x) <= 45))

  if (emptyStation) {
    await practice.lineMap.getByTestId(`line-map-command-DISPATCH-${Math.round(emptyStation.x)}`).click()
    await practice.lineMap.locator('.line-map-popup-window--command').getByRole('button', { name: 'Apply' }).click()
    await expect(coach(practice.lineMap).getByRole('alert')).toContainText(`No train at ${emptyStation.code}.`)
  }

  // Assessment (trainee 2): no aids anywhere, and the switch is locked off.
  const assessed = trainees[1]

  await show(1)
  await expect(aidsSwitch(1)).toBeDisabled()
  await expect(aidsSwitch(1)).toHaveText('Aids off')
  await expect(assessed.lineMap.locator('.line-map-dom-root')).toBeVisible()

  for (const page of [assessed.alarms, assessed.lineMap, assessed.timetable]) {
    await expect(coach(page)).toHaveCount(0)
  }

  for (const trainee of trainees) {
    await expect(trainee.lobby.getByRole('status')).toContainText('Exercise running')

    // Each Line Map runs its own exercise's trains.
    await expect(trainee.lineMap.locator('.line-map-dom-root')).toBeVisible()
    await expect(trainee.lineMap.getByTestId('line-map-view-only')).toHaveCount(0)

    // The incident alarm is acknowledged on Monitor 01 itself.
    const incident = trainee.alarms.locator('.alarm-dom-row--data', { hasText: /PSD: [A-Z]{3} (NB|SB) Door 07 Obstructed/ })

    await expect(incident).toHaveCount(1)
    await incident.click()
    await trainee.alarms.getByRole('button', { name: 'Ack. selection' }).click()
    await expect(trainee.alarms.locator('.alarm-dom-status')).toContainText('Acknowledged selected alarm')

    // The rest of the SOP as the trainee's commands (the monitors' own clicks are
    // covered by npm run test:ui).
    const headers = { authorization: `Bearer ${trainee.token}` }
    const session = (await (await request.get('/api/session', { headers })).json()).session as {
      activeScenario: { faultLocation: { station: string }; targetTrainId: string }
    }
    const trainId = session.activeScenario.targetTrainId
    const send = async (command: Record<string, unknown>) => {
      const response = await request.post('/api/session/commands', { data: { command, sourceId: 'lan-rehearsal' }, headers })

      expect((await response.json() as { accepted: boolean }).accepted).toBe(true)
    }

    await send({ trainId, type: 'SELECT_TRAIN', view: 'menu' })
    await send({ detail: 'Platform hold', trainId, type: 'TRAIN_HOLD' })

    for (const messageId of definition.tasks.flatMap((task) => task.commsMessageIds ?? [])) {
      await send({ request: { messageId, station: session.activeScenario.faultLocation.station, trainId }, type: 'LOG_CALL' })
    }

    await send({ command: 'DISPATCH', trainId, type: 'SCADA_TRAIN_COMMAND' })
  }

  // The console follows both exercises live; the trainer completes each.
  for (const [index, exercise] of exercises.entries()) {
    await show(index)
    await expect(exercise.locator('.trainer-console-checklist .trainer-console-panel-head span')).toHaveText(/^6 of 7$/)
    await exercise.getByRole('button', { name: 'Complete', exact: true }).click()
    await expect(exercise.getByRole('region', { name: 'Scenario status' }).getByText('COMPLETE', { exact: true })).toBeVisible()
  }

  for (const trainee of trainees) {
    await expect(trainee.lobby.getByRole('status')).toContainText('Exercise complete')
  }

  // Both runs are in the history under the right trainee.
  await consolePage.getByRole('button', { name: 'History' }).click()

  const runs = consolePage.locator('.history-runs')

  for (const trainee of TRAINEES) {
    await expect(runs.getByRole('row', { name: new RegExp(`${trainee.name}.*Pass.*100%`) })).toHaveCount(1)
  }

  // The Practice run records the aids used (not taken off the score); the
  // Assessment run has none to show.
  const summary = consolePage.locator('.history-summary')
  const discuss = consolePage.locator('.history-detail .report-discuss')

  await runs.getByRole('row', { name: new RegExp(TRAINEES[0].name) }).click()
  await expect(discuss).toContainText('Show me 1 · Locate 1')
  await consolePage.keyboard.press('Escape')
  await runs.getByRole('row', { name: new RegExp(TRAINEES[1].name) }).click()
  await expect(summary).toContainText('wrong actions')
  await expect(summary).not.toContainText('hint')
  await expect(discuss).not.toContainText('Used hints')

  // A trainee's progress shows only their own run.
  await trainees[1].lobby.getByRole('button', { name: 'My progress' }).click()
  await expect(trainees[1].lobby.getByRole('region', { name: 'Totals' }).locator('dd').first()).toHaveText('1')

  // The admin makes a backup from the People page.
  await consolePage.goto('/admin')
  await consolePage.getByRole('button', { name: 'Back up now' }).click()
  await expect(consolePage.getByText('Backup made.')).toBeVisible()
  await expect(consolePage.getByTestId('latest-backup')).toContainText('Latest:')

  await Promise.all([trainerPc.close(), ...trainees.map((trainee) => trainee.pc.close())])
  expect(errors).toEqual([])
})
