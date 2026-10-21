import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Download, Locator, Page } from '@playwright/test'
import { platformData } from '../src/screens/line-map/model'

const monitorRoutes = [
  { hasStationRibbon: true, root: '.scada-dom-root--alarms', route: '/screen/alarms' },
  { hasStationRibbon: true, root: '.line-map-dom-root', route: '/screen/line-map' },
  { hasStationRibbon: false, root: '.scada-dom-root--timetable', route: '/screen/timetable' },
] as const

// Test accounts on the test backend (port 8797): created on first use.
const PASSWORD = 'e2e-password-1'
const TRAINER = { name: 'Test Trainer', username: 'e2e.trainer' }
const TRAINEE = { name: 'Aisyah', username: 'aisyah' }
let trainerToken = ''

async function ensureAccounts(request: APIRequestContext) {
  if (trainerToken) {
    return trainerToken
  }

  const status = await (await request.get('/api/auth/status')).json() as { needsSetup: boolean }

  if (status.needsSetup) {
    await request.post('/api/auth/setup', { data: { ...TRAINER, password: PASSWORD } })
  }

  const signIn = await request.post('/api/auth/login', { data: { password: PASSWORD, username: TRAINER.username } })

  expect(signIn.ok()).toBeTruthy()
  trainerToken = (await signIn.json() as { token: string }).token
  // 409 once the trainee exists.
  await request.post('/api/users', {
    data: { ...TRAINEE, password: PASSWORD, role: 'trainee' },
    headers: { authorization: `Bearer ${trainerToken}` },
  })

  // A new host has no session until the trainer creates one.
  const listed = await (await request.get('/api/sessions', { headers: { authorization: `Bearer ${trainerToken}` } })).json() as { sessions: unknown[] }

  if (listed.sessions.length === 0) {
    await request.post('/api/sessions', { data: {}, headers: { authorization: `Bearer ${trainerToken}` } })
  }

  return trainerToken
}

const trainerHeaders = () => ({ authorization: `Bearer ${trainerToken}` })

async function signInBrowser(context: BrowserContext, token: string) {
  await context.addInitScript((value) => window.localStorage.setItem('occ.auth.token.v1', value), token)
}

async function getSession(page: Page) {
  return (await (await page.request.get('/api/session', { headers: trainerHeaders() })).json()).session
}

async function downloadText(page: Page, click: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]) as [Download, void]

  return { name: download.suggestedFilename(), text: await readFile((await download.path())!, 'utf8') }
}

async function signInToken(request: APIRequestContext, username: string) {
  const response = await request.post('/api/auth/login', { data: { password: PASSWORD, username } })

  return (await response.json() as { token: string }).token
}

// Back to one fresh exercise: empty and close Exercise 2, then start Exercise 1 afresh.
async function clearRuntime(page: Page) {
  const listed = await (await page.request.get('/api/sessions', { headers: trainerHeaders() })).json() as {
    sessions: Array<{ exercise: number; id: string; trainees: Array<{ id: string }> }>
  }

  for (const exercise of listed.sessions.filter((item) => item.exercise > 1)) {
    await page.request.post('/api/session/commands', {
      data: { command: { type: 'RESET_SCENARIO' }, sessionId: exercise.id, sourceId: 'playwright-regression' },
      headers: trainerHeaders(),
    })

    for (const trainee of exercise.trainees) {
      await page.request.post('/api/session/commands', {
        data: { command: { traineeId: trainee.id, type: 'TRAINEE_LEAVE' }, sessionId: exercise.id, sourceId: 'playwright-regression' },
        headers: trainerHeaders(),
      })
    }

    await page.request.delete(`/api/sessions/${encodeURIComponent(exercise.id)}`, { headers: trainerHeaders() })
  }

  const response = await page.request.post('/api/session/runtime', {
    data: { sourceId: 'playwright-regression' },
    headers: trainerHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

// The test trainee joins Exercise 1: a run needs a trainee (runGuards.ts).
async function joinTrainee(page: Page, request: APIRequestContext) {
  const code = (await getSession(page)).sessionMeta.code
  const response = await request.post('/api/class/join', {
    data: { code },
    headers: { authorization: `Bearer ${await signInToken(request, TRAINEE.username)}` },
  })

  expect(response.ok()).toBeTruthy()
}

// Show me's outline sits 4px outside the element it points at.
async function outlines(page: Page, target: Locator) {
  const [ring, box] = [await page.getByTestId('coach-highlight').boundingBox(), await target.boundingBox()]

  return Boolean(ring && box && Math.abs(ring.x + 4 - box.x) < 2 && Math.abs(ring.y + 4 - box.y) < 2)
}

function collectPageErrors(page: Page) {
  const errors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  return errors
}

// Each test sets up its own exercise (clearRuntime), so one failure does not
// skip the rest, and a retry re-runs only that test.
test.describe('OCC monitor regressions', () => {
  // Each test's browser is signed in as the test trainer unless it says otherwise.
  test.beforeEach(async ({ context, request }) => {
    await signInBrowser(context, await ensureAccounts(request))
  })

  for (const monitor of monitorRoutes) {
    test(`${monitor.route} fits the 1280x720 monitor viewport`, async ({ page }) => {
      const errors = collectPageErrors(page)

      await clearRuntime(page)
      await page.goto(monitor.route)
      await expect(page.locator(monitor.root)).toBeVisible()

      const dimensions = await page.evaluate(() => ({
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }))

      expect(dimensions).toEqual({
        clientHeight: 720,
        clientWidth: 1280,
        scrollHeight: 720,
        scrollWidth: 1280,
      })
      await expect(page.locator('.scada-dom-footer-status')).toHaveText('E2E.TRAINER[ TSR1 ] @ OCC')

      if (monitor.hasStationRibbon) {
        const ribbon = page.locator('.line-map-station-ribbon')

        await expect(ribbon).toHaveCount(1)
        await expect(ribbon.getByText('HBF', { exact: true })).toBeVisible()
        await expect(ribbon.getByText('OVERALL', { exact: true })).toBeVisible()
      }

      expect(errors).toEqual([])
    })
  }

  test('alarm and calls tabs expose their matching panels', async ({ page }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await page.goto('/screen/line-map')

    const summary = page.getByRole('region', { name: 'Calls and alarm summary' })
    const alarmsTab = summary.getByRole('tab', { name: 'Alarms', exact: true })
    const callsTab = summary.getByRole('tab', { name: 'Calls', exact: true })

    await expect(summary).toHaveCount(1)
    await expect(callsTab).toHaveAttribute('aria-selected', 'true')
    await expect(summary.getByRole('tabpanel', { name: 'Calls' })).toBeVisible()

    await alarmsTab.click()
    await expect(alarmsTab).toHaveAttribute('aria-selected', 'true')
    await expect(summary.getByRole('tabpanel', { name: 'Alarms' })).toBeVisible()
    await expect(summary.getByRole('link', { name: 'Display alarms page' })).toBeVisible()

    await callsTab.click()
    await expect(callsTab).toHaveAttribute('aria-selected', 'true')
    await expect(summary.getByRole('tabpanel', { name: 'Calls' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('Display opens the alarms monitor with the shared ribbon and footer', async ({ page }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await page.goto('/screen/line-map')

    const summary = page.getByRole('region', { name: 'Calls and alarm summary' })

    await summary.getByRole('tab', { name: 'Alarms', exact: true }).click()
    await Promise.all([
      page.waitForURL('**/screen/alarms'),
      summary.getByRole('link', { name: 'Display alarms page' }).click(),
    ])

    await expect(page.locator('.scada-dom-root--alarms')).toBeVisible()
    await expect(page.locator('.line-map-station-ribbon')).toHaveCount(1)
    await expect(page.locator('.scada-dom-footer-status')).toHaveText('E2E.TRAINER[ TSR1 ] @ OCC')
    expect(errors).toEqual([])
  })

  test('line map remains stable through a timetable scheduler refresh', async ({ page }) => {
    test.setTimeout(60_000)
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await page.goto('/screen/line-map')
    await expect(page.locator('.line-map-dom-root')).toBeVisible()
    await page.waitForTimeout(35_000)

    expect(errors).toEqual([])
  })

  test('Train Launch timetable selection remains loaded on the line map', async ({ page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')

    await page.getByRole('radio', { name: 'Train Launch' }).click()
    const loadButton = page.getByRole('button', { name: 'Load scenario', exact: true })
    await expect(loadButton).toHaveCount(1)
    await loadButton.click()
    const scenarioStatus = page.getByRole('region', { name: 'Scenario status' })
    await expect(scenarioStatus.getByText('Train Launch', { exact: true })).toBeVisible()
    await expect(scenarioStatus.getByText('RUNNING', { exact: true })).toBeVisible()

    await page.goto('/screen/timetable')
    const launchRow = page.getByTestId('timetable-row-301-1000')
    await expect(launchRow).toBeVisible()

    // Selecting the row is a command; the server binds the launch train.
    const commandResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith('/api/session/commands')
      && response.request().postDataJSON()?.command?.type === 'SELECT_TRAIN'
    ))
    await launchRow.click()
    const commandResponse = await commandResponsePromise
    const commandPayload = await commandResponse.json()
    const selectedSession = await getSession(page)

    expect(commandPayload.accepted).toBe(true)
    expect(selectedSession.activeScenario.targetTrainId).toBe('301')
    expect(selectedSession.selectedTrainId).toBe('301')

    await page.goto('/screen/line-map')
    const trainHotspot = page.locator('[data-testid^="train-hotspot-301-"]')

    await expect(trainHotspot).toHaveCount(1)
    await expect(trainHotspot).toHaveAttribute('data-status', 'WAIT')
    await page.waitForTimeout(3_000)
    await expect(trainHotspot).toHaveCount(1)

    expect((await getSession(page)).activeScenario.targetTrainId).toBe('301')
    expect(errors).toEqual([])
  })
  test('fault scenarios only credit acknowledging the incident alarm', async ({ page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')
    await page.getByRole('radio', { name: /PSD Fault/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Scenario status' }).getByText('PSD Obstructed', { exact: true })).toBeVisible()

    const ackAlarmTask = async () => (await getSession(page)).scenarioTasks.ackAlarm

    await page.goto('/screen/alarms')
    await page.locator('.alarm-dom-row--data', { hasText: 'IOS scenario armed' }).first().click()
    await page.getByRole('button', { name: 'Ack. selection' }).click()
    await expect(page.locator('.alarm-dom-status')).toContainText('Acknowledged selected alarm')
    await page.waitForTimeout(500)
    expect(await ackAlarmTask()).toBe(false)

    await page.locator('.alarm-dom-row--data', { hasText: /PSD: [A-Z]{3} (NB|SB) Door 07 Obstructed/ }).first().click()
    await page.getByRole('button', { name: 'Ack. selection' }).click()
    await expect.poll(ackAlarmTask).toBe(true)
    expect(errors).toEqual([])
  })

  test('a trainee signs in, joins with the session code and the trainer sees them', async ({ browser, page }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)

    // The trainee uses their own browser, signed in through the form.
    const traineeContext = await browser.newContext()
    const trainee = await traineeContext.newPage()

    await trainee.goto('/ios/modules')
    await expect(trainee.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await trainee.getByLabel('Username').fill(TRAINEE.username)
    await trainee.getByLabel('Password').fill(PASSWORD)
    await trainee.getByRole('button', { name: 'Sign in' }).click()

    // The console is for trainers.
    await expect(trainee.getByRole('heading', { name: 'Not available' })).toBeVisible()
    await trainee.getByRole('button', { name: 'Go to the start page' }).click()
    await expect(trainee.getByText(`Signed in as ${TRAINEE.name}`)).toBeVisible()
    await expect(trainee.getByRole('button', { name: /Trainer/ })).toHaveCount(0)
    await trainee.getByRole('button', { name: /Trainee/ }).click()
    await expect(trainee).toHaveURL(/\/session\/join$/)

    await trainee.getByLabel('Session code').fill('WRONG-CODE')
    await trainee.getByRole('button', { name: 'Join session' }).click()
    await expect(trainee.getByRole('alert')).toContainText('does not match')

    const sessionCode = (await getSession(page)).sessionMeta.code
    await trainee.getByLabel('Session code').fill(sessionCode.toLowerCase())
    await trainee.getByRole('button', { name: 'Join session' }).click()
    await expect(trainee.getByRole('status')).toContainText('Waiting for trainer')

    await page.goto('/ios/modules')
    await expect(page.getByLabel('Session').getByText(sessionCode, { exact: true })).toBeVisible()
    await expect(page.getByLabel('Session').getByText(TRAINEE.name)).toBeVisible()

    // The trainee page reports a running exercise without naming the incident.
    await page.getByRole('radio', { name: /PSD Fault/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()
    await expect(trainee.getByRole('status')).toContainText('Exercise running')
    await expect(trainee.getByText(/PSD/)).toHaveCount(0)

    // The trainee's actions are logged under their account.
    const log = await (await page.request.get('/api/session/actions', { headers: trainerHeaders() })).json() as { actions: Array<{ action_type: string; actor_id: string }> }

    expect(log.actions.find((entry) => entry.action_type === 'TRAINEE_JOIN')?.actor_id).toBe(TRAINEE.username)
    await traineeContext.close()
    expect(errors).toEqual([])
  })

  test('two trainees work in separate exercises side by side', async ({ browser, page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await page.goto('/ios/modules')
    await page.getByRole('button', { name: 'Add Exercise 2' }).click()

    const exercise1 = page.getByRole('region', { name: 'Exercise 1' })
    const exercise2 = page.getByRole('region', { name: 'Exercise 2' })
    const tab = (name: string) => page.getByRole('tab', { name: new RegExp(name) })

    // One exercise shows at a time; a new one opens in front.
    await expect(exercise2).toBeVisible()
    await expect(exercise1).toBeHidden()

    // The code shows once the exercise's session has arrived.
    await expect(exercise2.locator('.trainer-console-code')).toHaveText(/^[A-Z2-9]{4}$/)

    const code2 = (await exercise2.locator('.trainer-console-code').textContent())!.trim()

    // The trainee joins Exercise 2 with its code.
    const traineeContext = await browser.newContext()

    await signInBrowser(traineeContext, await signInToken(request, TRAINEE.username))

    const trainee = await traineeContext.newPage()

    await trainee.goto('/session/join')
    await trainee.getByLabel('Session code').fill(code2)
    await trainee.getByRole('button', { name: 'Join session' }).click()
    await expect(trainee.getByRole('status')).toContainText('Waiting for trainer')
    await expect(trainee.locator('.trainee-facts')).toContainText(code2)
    await expect(exercise2.getByLabel('Session').getByText(TRAINEE.name)).toBeVisible()

    // A scenario loaded into Exercise 2 leaves Exercise 1 idle.
    await exercise2.getByRole('radio', { name: /PSD Fault/ }).click()
    await exercise2.getByRole('button', { name: 'Load scenario', exact: true }).click()
    await expect(exercise2.getByRole('region', { name: 'Scenario status' }).getByText('RUNNING', { exact: true })).toBeVisible()
    await expect(tab('Exercise 2')).toContainText('running')
    await tab('Exercise 1').click()
    await expect(exercise1.getByRole('region', { name: 'Scenario status' }).getByText('IDLE', { exact: true })).toBeVisible()
    await tab('Exercise 2').click()
    await expect(trainee.getByRole('status')).toContainText('Exercise running')

    // The trainee's monitors show their exercise, and follow them when moved.
    const incidentAlarm = trainee.locator('.alarm-dom-row--data', { hasText: /PSD: [A-Z]{3} (NB|SB) Door 07 Obstructed/ })

    await trainee.goto('/screen/alarms')
    await expect(incidentAlarm).toHaveCount(1)

    // She cannot be moved while her run is going; stopping it asks first.
    await expect(exercise2.getByRole('button', { name: 'Move to Exercise 1' })).toBeDisabled()
    await exercise2.getByRole('button', { name: 'Stop', exact: true }).click()
    await exercise2.getByRole('alertdialog', { name: 'Stop the run?' }).getByRole('button', { name: 'Stop run' }).click()
    await expect(exercise2.getByRole('region', { name: 'Scenario status' }).getByText('IDLE', { exact: true })).toBeVisible()
    await exercise2.getByRole('button', { name: 'Move to Exercise 1' }).click()
    await tab('Exercise 1').click()
    await expect(exercise1.getByLabel('Session').getByText(TRAINEE.name)).toBeVisible()
    await expect(incidentAlarm).toHaveCount(0)
    await tab('Exercise 2').click()

    // Exercise 2's list says where she is now, and assigning her moves her back.
    await expect(exercise2.getByRole('button', { name: 'Move here' })).toBeVisible()
    await expect(exercise2.locator('.trainer-exercise-assign')).toContainText(`${TRAINEE.name} (in Exercise 1)`)

    await exercise2.getByRole('button', { name: 'Close exercise' }).click()
    await expect(exercise2).toHaveCount(0)
    await traineeContext.close()
    expect(errors).toEqual([])
  })

  test('the trainer reviews a past run and the trainee sees their progress', async ({ browser, page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)

    const traineeToken = await signInToken(request, TRAINEE.username)
    const traineeHeaders = { authorization: `Bearer ${traineeToken}` }
    const code = (await getSession(page)).sessionMeta.code

    await request.post('/api/class/join', { data: { code }, headers: traineeHeaders })
    await page.goto('/ios/modules')
    await page.getByRole('radio', { name: /PSD Fault/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Scenario status' }).getByText('RUNNING', { exact: true })).toBeVisible()

    // The trainee acts on their monitors; the trainer saves notes, which archives the run.
    const incident = (await getSession(page)).alarmSummaryRows.find((row: { scenarioAlarm?: boolean }) => row.scenarioAlarm)

    await request.post('/api/session/commands', {
      data: { command: { rowKeys: [`${incident.timestamp}|${incident.asset}|${incident.description}`], type: 'ACK_ALARMS' }, sourceId: 'e2e' },
      headers: traineeHeaders,
    })
    await request.post('/api/reports', { data: { notes: 'E2E history check' }, headers: trainerHeaders() })

    await page.getByRole('button', { name: 'History' }).click()
    await expect(page.getByRole('heading', { name: 'Run history' })).toBeVisible()
    await page.getByRole('button', { name: /PSD Obstructed/ }).first().click()
    await expect(page.getByText('E2E history check')).toBeVisible()

    const actions = page.locator('.history-actions')

    // Every action is one click away.
    await page.getByText(/^All actions/).click()

    await expect(actions.getByRole('row', { name: /Aisyah \(trainee\).*Acknowledged alarms/ })).toBeVisible()
    await expect(actions.getByRole('row', { name: /Loaded the scenario/ })).toBeVisible()

    // The run and the run list export as CSV for training records.
    const runCsv = await downloadText(page, () => page.locator('.history-detail').getByRole('button', { name: 'Export CSV' }).click())

    expect(runCsv.name).toMatch(/^occ-run-aisyah-\d{4}-\d{2}-\d{2}-PSD-Obstructed\.csv$/)
    expect(runCsv.text.startsWith('\uFEFFRun,PSD Obstructed')).toBe(true)
    expect(runCsv.text).toContain('Trainer notes,E2E history check')
    expect(runCsv.text).toMatch(/Aisyah,trainee,Acknowledged alarms,.*,Done/)

    await expect(page.getByRole('button', { name: 'Print / PDF' })).toBeVisible()
    await page.keyboard.press('Escape')

    const listCsv = await downloadText(page, () => page.locator('.app-shell-actions').getByRole('button', { name: 'Export CSV' }).click())

    expect(listCsv.name).toMatch(/^occ-runs-all-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(listCsv.text).toContain('Date,Trainee,Scenario,Exercise')
    expect(listCsv.text).toMatch(/Aisyah,PSD Obstructed,1,[A-Z2-9]{4},practice,NOT COMPLETED/)

    // The trainee's own progress.
    const traineeContext = await browser.newContext()

    await signInBrowser(traineeContext, traineeToken)

    const trainee = await traineeContext.newPage()

    await trainee.goto('/progress')
    await expect(trainee.getByRole('heading', { name: 'My progress' })).toBeVisible()
    await expect(trainee.getByRole('region', { name: 'Totals' })).toContainText(TRAINEE.name)
    await expect(trainee.getByRole('button', { name: /PSD Obstructed/ }).first()).toBeVisible()
    await traineeContext.close()
    expect(errors).toEqual([])
  })

  test('a train loop & shuttle disruption is worked from the Calls panel', async ({ page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')
    await page.getByRole('radio', { name: /Train Loop & Shuttle Service/ }).click()
    await page.getByRole('button', { name: 'Incident', exact: true }).click()
    await page.getByRole('option', { name: 'Dual train loop with shuttle' }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()

    const status = page.getByRole('region', { name: 'Scenario status' })

    await expect(status.getByText('Dual train loop with shuttle', { exact: true })).toBeVisible()
    await expect(status).toContainText('line-wide')
    await expect(page.getByText(/Service disruption: loops PGC – HGN and HBF – FRP; shuttle HGN – SER/).first()).toBeVisible()

    // Line-wide: no scenario train, nothing held.
    expect((await getSession(page)).activeScenario.targetTrainId).toBeUndefined()

    // Each SOP call is made from the Calls dialog on the Line Map.
    const calls = [
      { channel: 'Radio', message: 'Train loop service and free regular & bridging bus service in operation', to: 'Radio - Broadcast to all Stations & Trains' },
      { channel: 'Teleph.', message: 'Train loop service implemented: your station is an intermediate terminal', station: 'FRP', to: 'Teleph. - Station Staff (SM/ASM)' },
      { channel: 'Teleph.', message: 'Prepare and record disruption PA for stations and trains', to: 'Teleph. - Communication Controller (CoC)' },
      { channel: 'Teleph.', message: 'Prepare and record PA for stations and train on the shuttle service', to: 'Teleph. - Communication Controller (CoC)' },
      { channel: 'Teleph.', message: 'Disseminate the Train Disruption Notice to all stations', to: 'Teleph. - Communication Controller (CoC)' },
      { channel: 'Radio', message: 'CSOs to make local PA in the train every 4 minutes', to: 'Radio - Broadcast to all Stations & Trains' },
    ]

    await page.goto('/screen/line-map')

    const callControls = page.getByLabel('Call controls')

    for (const call of calls) {
      await callControls.getByRole('button', { name: new RegExp(`^${call.channel.replace('.', '\\.')} \\d+$`) }).click()

      const dialog = page.getByRole('dialog', { name: 'OCC communications' })
      const field = (name: string) => dialog.locator('.comms-dialog-field', { has: page.getByText(name, { exact: true }) }).locator('select')

      await field('Call to').selectOption({ label: call.to })

      if (call.station) {
        await field('Station').selectOption(call.station)
      }

      await field('Message').selectOption({ label: call.message })
      await dialog.getByRole('button', { name: 'Send' }).click()
      await expect(dialog.locator('output')).toHaveText(`Logged: ${call.message}`)
      await dialog.getByRole('button', { name: 'Close' }).click()
    }

    // The checklist is done but for the review; the trainer completes it as a pass.
    await page.goto('/ios/modules')
    await expect(status).toContainText('6 / 7')
    await status.getByRole('button', { name: 'Complete' }).click()
    await expect(status.getByText('COMPLETE', { exact: true })).toBeVisible()
    await expect(status).toContainText('100%')
    expect(errors).toEqual([])
  })

  test('the trainer confirms doors & PSDs closed in an unscheduled withdrawal', async ({ page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')
    await page.getByRole('radio', { name: /Unscheduled Train Withdrawal/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()

    const status = page.getByRole('region', { name: 'Scenario status' })

    await expect(status.getByText('Unscheduled Train Withdrawal', { exact: true })).toBeVisible()

    // The train CC chose is held at a platform, named in the notice.
    const session = await getSession(page)
    const trainId = session.activeScenario.targetTrainId as string
    const { station, track } = session.activeScenario.faultLocation as { station: string; track: string }

    expect(session.trains.find((train: { id: string }) => train.id === trainId)?.status).toBe('HOLD')
    await expect(page.getByText(`CC has decided to withdraw Train ${trainId} at ${station} ${track}`).first()).toBeVisible()

    // The trainee makes the SOP calls.
    const traineeHeaders = { authorization: `Bearer ${await signInToken(request, TRAINEE.username)}` }

    for (const messageId of ['driver-withdraw-train-clear', 'station-assist-train-clear', 'coc-withdrawal-pa', 'dtc-withdrawal-return', 'driver-train-clear-received']) {
      const response = await request.post('/api/session/commands', {
        data: { command: { request: { messageId, station, trainId }, type: 'LOG_CALL' }, sourceId: 'e2e' },
        headers: traineeHeaders,
      })

      expect(response.ok()).toBeTruthy()
    }

    // Closing doors & PSDs has no simulator command: the trainer confirms it.
    const doorsStep = page.locator('.trainer-console-tasks li', { hasText: 'Close all train doors & PSDs for train clear' })

    await doorsStep.getByRole('button', { name: 'Confirm' }).click()
    // Done steps fold into a count; the trainer step no longer waits on the trainer.
    await expect(doorsStep).toHaveCount(0)
    await expect(page.getByRole('button', { name: /6 steps done/ })).toBeVisible()
    await expect(status).toContainText('6 / 9')

    // Completing before the train is selected, routed and moved is refused.
    await status.getByRole('button', { name: 'Complete' }).click()
    await expect(page.getByText(/Cannot complete yet\. Open: Select affected train, Route the train to the designated destination\./).first()).toBeVisible()
    await expect(status.getByText('RUNNING', { exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('changing your own password asks to confirm it, then signs you out', async ({ browser, request }) => {
    // Its own admin account, so the other tests' trainer password stays as it is.
    const admin = { name: 'Password Admin', username: `pw.admin.${Date.now()}` }

    await request.post('/api/users', { data: { ...admin, admin: true, password: PASSWORD, role: 'trainer' }, headers: trainerHeaders() })

    const context = await browser.newContext()

    await signInBrowser(context, await signInToken(request, admin.username))

    const page = await context.newPage()
    const panel = page.getByRole('dialog', { name: 'Reset password' })

    await page.goto('/admin')
    await page.getByRole('row', { name: new RegExp(admin.username) }).getByRole('button', { name: 'Reset password' }).click()
    await panel.getByRole('textbox', { name: /^New password/ }).fill('new-password-1')
    await panel.getByRole('textbox', { name: /^Confirm new password/ }).fill('new-password-2')
    await panel.getByRole('button', { name: 'Set password' }).click()
    await expect(panel.getByRole('alert')).toHaveText('The two passwords do not match.')

    await panel.getByRole('textbox', { name: /^Confirm new password/ }).fill('new-password-1')
    await panel.getByRole('button', { name: 'Set password' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Your password was changed. Sign in with the new password.')).toBeVisible()

    await page.getByLabel('Username').fill(admin.username)
    await page.getByLabel('Password').fill('new-password-1')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
    await context.close()
  })

  test('without signing in, every page asks for a sign-in', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    for (const route of ['/', '/ios/modules', '/screen/line-map', '/admin']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    }

    await context.close()
  })

  test('only one Line Map window runs the trains, and the clock passes on when it closes', async ({ context, page }) => {
    await clearRuntime(page)
    await page.goto('/screen/line-map')
    await expect(page.locator('.line-map-dom-root')).toBeVisible()

    const second = await context.newPage()

    await second.goto('/screen/line-map')
    await expect(second.getByTestId('line-map-view-only')).toBeVisible()
    await expect(page.getByTestId('line-map-view-only')).toHaveCount(0)

    // Taking control moves the clock; closing that window hands it back.
    await second.getByRole('button', { name: 'Take control' }).click()
    await expect(second.getByTestId('line-map-view-only')).toHaveCount(0)
    await expect(page.getByTestId('line-map-view-only')).toBeVisible()

    await second.close()
    await expect(page.getByTestId('line-map-view-only')).toHaveCount(0)
  })

  test('the Practice coach shows the next step, and nothing in Assessment', async ({ context, page, request }) => {
    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')
    await page.getByRole('radio', { name: /Train Door Fault/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()

    const aids = page.getByRole('button', { name: /^Aids (on|off)$/ })

    await expect(aids).toHaveText('Aids on')
    await expect(aids).toHaveAttribute('aria-pressed', 'true')

    const trainId = (await getSession(page)).activeScenario.targetTrainId as string
    const alarms = await context.newPage()
    const lineMap = await context.newPage()

    await alarms.goto('/screen/alarms')
    await lineMap.goto('/screen/line-map')

    // The first step is on the Line Map; the other monitors point there.
    const alarmsCoach = alarms.getByRole('complementary', { name: 'Practice coach' })
    const lineMapCoach = lineMap.getByRole('complementary', { name: 'Practice coach' })

    await expect(alarmsCoach).toContainText('Next step is on Monitor 02 Line Map')
    await expect(lineMapCoach).toContainText('Next: Select affected train')

    // As at the OCC, the alarm summary opens with no row selected.
    await expect(alarms.locator('.alarm-dom-row--data').first()).toBeVisible()
    await expect(alarms.locator('.alarm-dom-row--data[aria-pressed="true"]')).toHaveCount(0)

    // Out of order: acknowledging before selecting the train is refused, and the coach says why.
    const alarmsFeedback = alarmsCoach.getByRole('alert')

    await alarms.locator('.alarm-dom-row--data', { hasText: `Train ${trainId} Car 3` }).click()
    await alarms.getByRole('button', { name: 'Ack. selection' }).click()
    await expect(alarmsFeedback).toContainText(`Select Train ${trainId} before acknowledging its alarm.`)
    await alarmsFeedback.getByRole('button', { name: 'Dismiss' }).click()
    await expect(alarmsFeedback).toHaveCount(0)
    await lineMapCoach.getByRole('button').click()
    await expect(lineMapCoach).toContainText(`Right-click Train ${trainId} on the Line Map`)

    // Show me outlines the train; Locate rings it. Neither takes clicks.
    const highlight = lineMap.getByTestId('coach-highlight')
    const hotspot = lineMap.locator(`[data-testid^="train-hotspot-${trainId}-"]`)
    const covers = async () => {
      const [ring, train] = [await highlight.boundingBox(), await hotspot.boundingBox()]

      return Boolean(ring && train && ring.x <= train.x && ring.y <= train.y
        && ring.x + ring.width >= train.x + train.width && ring.y + ring.height >= train.y + train.height)
    }

    await lineMapCoach.getByRole('button', { name: 'Show me' }).click()
    await expect(highlight).toHaveClass(/coach-highlight--outline/)
    await expect.poll(covers).toBe(true)
    await lineMapCoach.getByRole('button', { name: `Locate Train ${trainId}` }).click()
    await expect(highlight).toHaveClass(/coach-highlight--ring/)
    await expect.poll(covers).toBe(true)
    await hotspot.click({ button: 'right' })

    // Next step is on Alarms: Show me outlines the red row, then Ack. selection once it is selected.
    const incidentRow = alarms.locator('.alarm-dom-row--data', { hasText: `Train ${trainId} Car 3` })

    await alarms.getByRole('button', { name: 'Unselect alarms' }).click()
    await alarmsCoach.locator('.training-coach-head').click()
    await expect(alarmsCoach).toContainText('Acknowledge door fault alarm')
    await alarmsCoach.getByRole('button', { name: 'Show me' }).click()
    await expect.poll(() => outlines(alarms, incidentRow)).toBe(true)
    await incidentRow.click()
    await alarmsCoach.getByRole('button', { name: 'Show me' }).click()
    await expect.poll(() => outlines(alarms, alarms.getByRole('button', { name: 'Ack. selection' }))).toBe(true)

    // Acknowledged: the next step, Apply door fault procedure, is on the Line Map.
    await incidentRow.click()
    await alarms.getByRole('button', { name: 'Ack. selection' }).click()
    await expect(alarmsCoach).toContainText('Next step is on Monitor 02')

    // Aids used are counted for the report and History, and the score is not reduced.
    await expect.poll(async () => (await getSession(page)).assessmentMetrics.aidsUsed).toEqual({ locate: 1, showMe: 3 })

    const report = await context.newPage()

    await report.goto(`/report?session=${encodeURIComponent((await getSession(page)).sessionMeta.code)}`)
    // The scorecard: hints on the summary line, the refusal under To discuss.
    await expect(report.locator('.report-discuss')).toContainText('Show me 3 · Locate 1')
    await expect(report.locator('.report-discuss')).toContainText('Refused: Select Train')
    // Signed off by the signed-in trainer; the timeline names people, not system sources.
    await expect(report.locator('.report-signoff')).toContainText('Test Trainer')
    await report.getByText(/^All actions/).click()
    await expect(report.locator('.report-event', { hasText: 'Refused' }).first()).toContainText('Test Trainer')
    await expect(report.locator('.report-event').filter({ hasText: /Scenario Guard|IOS Scenario/ })).toHaveCount(0)
    await report.request.post('/api/reports', { data: { notes: 'E2E aids check' }, headers: trainerHeaders() })
    await report.goto('/history')
    await report.getByRole('button', { name: /Train Door Fault/ }).first().click()
    await expect(report.getByText('E2E aids check')).toBeVisible()
    await expect(report.locator('.history-detail .report-discuss')).toContainText('Show me 3 · Locate 1')
    await report.close()

    // The trainer's switch hides it everywhere.
    await aids.click()
    await expect(aids).toHaveText('Aids off')
    await expect(alarmsCoach).toHaveCount(0)
    await expect(lineMapCoach).toHaveCount(0)
    await aids.click()
    await expect(alarmsCoach).toBeVisible()

    // Assessment: no coach, and the switch cannot turn it on. During a run the
    // scenario picker is behind New run.
    await expect(page.getByRole('region', { name: 'Scenario status' })).toContainText('Train Door Fault')
    await page.getByRole('button', { name: 'New run' }).click()
    await page.getByRole('radiogroup', { name: 'Training mode' }).getByRole('radio', { name: 'Assessment' }).click()
    await page.getByRole('button', { name: 'Restart with this scenario' }).click()
    await page.getByRole('alertdialog', { name: 'Start a new run?' }).getByRole('button', { name: 'Start new run' }).click()
    await expect(aids).toBeDisabled()
    await expect(aids).toHaveText('Aids off')
    await expect(alarmsCoach).toHaveCount(0)
    await expect(lineMapCoach).toHaveCount(0)

    // The same wrong action gets no message in Assessment.
    await alarms.locator('.alarm-dom-row--data', { hasText: 'Car 3' }).first().click()
    const refused = alarms.waitForResponse((response) => response.url().endsWith('/api/session/commands'))

    await alarms.getByRole('button', { name: 'Ack. selection' }).click()
    expect((await (await refused).json()).accepted).toBe(false)
    await expect(alarms.locator('.training-coach-feedback')).toHaveCount(0)
  })

  test('Show me finds the timetable row and the station panel button', async ({ context, page, request }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
    await joinTrainee(page, request)
    await page.goto('/ios/modules')

    // Train Launch: before the trainer assigns a train, the trainee picks one in
    // the Timetable; Show me outlines the row of a train leaving the depot.
    await page.getByRole('radio', { name: /Train Launch/ }).click()
    await page.getByRole('button', { name: 'Load scenario', exact: true }).click()

    const timetable = await context.newPage()
    const timetableCoach = timetable.getByRole('complementary', { name: 'Practice coach' })

    await timetable.goto('/screen/timetable')
    await expect(timetableCoach).toContainText('Next: Select train to launch')
    await timetableCoach.locator('.training-coach-head').click()

    await expect(timetableCoach).toContainText('leaving the depot, e.g. Train')
    const launchTrainId = (await timetableCoach.textContent())?.match(/e\.g\. Train (\d+)/)?.[1] as string
    const launchRow = timetable.locator(`[data-testid^="timetable-row-${launchTrainId}-"]`).first()

    expect(launchTrainId).toBeTruthy()
    await timetableCoach.getByRole('button', { name: 'Show me' }).click()
    await expect.poll(() => outlines(timetable, launchRow)).toBe(true)
    await launchRow.click()
    await expect.poll(async () => (await getSession(page)).activeScenario.targetTrainId).toBe(launchTrainId)
    await expect(timetableCoach).not.toContainText('Select train to launch')
    await timetable.close()

    // PSD failed to close: once the train is held and the calls are made, IDT from the fault station's panel.
    await page.getByRole('button', { name: 'New run' }).click()
    await page.getByRole('radio', { name: /PSD Fault/ }).click()
    await page.getByRole('button', { name: 'Incident', exact: true }).click()
    await page.getByRole('option', { name: 'Single PSD failed to close' }).click()
    await page.getByRole('button', { name: 'Restart with this scenario' }).click()
    await page.getByRole('alertdialog', { name: 'Start a new run?' }).getByRole('button', { name: 'Start new run' }).click()
    await expect.poll(async () => (await getSession(page)).activeScenario.id).toBe('psd-fault-fail-close')

    const session = await getSession(page)
    const trainId = session.activeScenario.targetTrainId as string
    const station = session.activeScenario.faultLocation.station as string
    const incident = session.alarmSummaryRows.find((row: { scenarioAlarm?: boolean }) => row.scenarioAlarm)
    const send = async (command: Record<string, unknown>) => {
      const response = await page.request.post('/api/session/commands', { data: { command, sourceId: 'e2e' }, headers: trainerHeaders() })

      expect((await response.json()).accepted, String(command.type)).toBe(true)
    }

    await send({ trainId, type: 'SELECT_TRAIN', view: 'menu' })
    await send({ rowKeys: [`${incident.timestamp}|${incident.asset}|${incident.description}`], type: 'ACK_ALARMS' })
    await send({ detail: '', trainId, type: 'TRAIN_HOLD' })

    for (const messageId of ['station-investigate-psd', 'wc-alert-fault', 'cc-alert-incident', 'driver-standby-console', 'station-isolate-psd-open']) {
      await send({ request: { messageId, station, trainId }, type: 'LOG_CALL' })
    }

    const lineMap = await context.newPage()
    const lineMapCoach = lineMap.getByRole('complementary', { name: 'Practice coach' })
    const panelX = Math.round(platformData.find((platform) => platform.code === station)!.x)

    await lineMap.goto('/screen/line-map')
    await expect(lineMapCoach).toContainText('Next: Issue IDT')
    await lineMapCoach.locator('.training-coach-head').click()
    await expect(lineMapCoach).toContainText(`DISPATCH on the ${station} station panel`)
    await lineMapCoach.getByRole('button', { name: 'Show me' }).click()
    await expect.poll(() => outlines(lineMap, lineMap.getByTestId(`line-map-command-DISPATCH-${panelX}`))).toBe(true)

    // The panel commands the train at its own station: its dialog names that train.
    const commandDialog = lineMap.locator('.line-map-popup-window--command')

    await lineMap.getByTestId(`line-map-command-DISPATCH-${panelX}`).click()
    await expect(commandDialog).toContainText(`EMU/${trainId}/TRN`)
    await commandDialog.getByRole('button', { name: 'Close' }).click()

    // A panel at a station with no train is refused, and the coach says so.
    const trains = (await getSession(page)).trains as Array<{ lineMapVisible?: boolean; x: number }>
    const empty = platformData.find((platform) => ['SKG', 'PGL', 'PGC'].includes(platform.code)
      && !trains.some((train) => train.lineMapVisible !== false && Math.abs(train.x - platform.x) <= 45))

    if (empty) {
      await lineMap.getByTestId(`line-map-command-DISPATCH-${Math.round(empty.x)}`).click()
      await expect(commandDialog).toContainText('EMU/---/TRN')
      await commandDialog.getByRole('button', { name: 'Apply' }).click()
      await expect(lineMapCoach.getByRole('alert')).toContainText(`No train at ${empty.code}.`)
    }

    expect(errors).toEqual([])
  })
})
