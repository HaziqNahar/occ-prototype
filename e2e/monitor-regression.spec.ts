import { expect, test } from '@playwright/test'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'

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

  return trainerToken
}

const trainerHeaders = () => ({ authorization: `Bearer ${trainerToken}` })

async function signInBrowser(context: BrowserContext, token: string) {
  await context.addInitScript((value) => window.localStorage.setItem('occ.auth.token.v1', value), token)
}

async function getSession(page: Page) {
  return (await (await page.request.get('/api/session', { headers: trainerHeaders() })).json()).session
}

async function clearRuntime(page: Page) {
  const response = await page.request.post('/api/session/runtime', {
    data: { sourceId: 'playwright-regression' },
    headers: trainerHeaders(),
  })

  expect(response.ok()).toBeTruthy()
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

test.describe.serial('OCC monitor regressions', () => {
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
      await expect(page.locator('.scada-dom-footer-status')).toHaveText('[ TSR1 ] @ OCC')

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
    await expect(page.locator('.scada-dom-footer-status')).toHaveText('[ TSR1 ] @ OCC')
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

  test('Train Launch timetable selection remains loaded on the line map', async ({ page }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
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
  test('fault scenarios only credit acknowledging the incident alarm', async ({ page }) => {
    const errors = collectPageErrors(page)

    await clearRuntime(page)
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

    await page.locator('.alarm-dom-row--data', { hasText: /PSD: [A-Z]{3} (NB|SB) Door 07 Obstructed/ }).click()
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
})
