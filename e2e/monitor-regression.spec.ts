import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const monitorRoutes = [
  { hasStationRibbon: true, root: '.scada-dom-root--alarms', route: '/screen/alarms' },
  { hasStationRibbon: true, root: '.line-map-dom-root', route: '/screen/line-map' },
  { hasStationRibbon: false, root: '.scada-dom-root--timetable', route: '/screen/timetable' },
] as const

async function clearRuntime(page: Page) {
  const response = await page.request.post('/api/session/runtime', {
    data: { sourceId: 'playwright-regression' },
  })

  expect(response.ok()).toBeTruthy()
}

function collectPageErrors(page: Page) {
  const errors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (message.text().includes('409 (Conflict)')) {
        return
      }

      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    const isExpectedSessionConflict = response.status() === 409 && (
      response.url().endsWith('/api/session/screens')
      || (response.request().method() === 'PUT' && response.url().endsWith('/api/session'))
    )

    if (isExpectedSessionConflict) {
      return
    } else if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  return errors
}

test.describe.serial('OCC monitor regressions', () => {
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

    const armButton = page.getByRole('button', { name: 'Arm Selected Scenario', exact: true })
    await expect(armButton).toHaveCount(1)
    await armButton.click()
    await expect(page.getByText('Train Launch | Select train to launch', { exact: true })).toBeVisible()

    await page.goto('/screen/timetable')
    const launchRow = page.getByTestId('timetable-row-301-1000')
    await expect(launchRow).toBeVisible()

    const actionResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith('/api/session/actions')
    ))
    await launchRow.click()
    const actionResponse = await actionResponsePromise
    const actionPayload = await actionResponse.json()

    expect(actionPayload.accepted).toBe(true)
    expect(actionPayload.session.activeScenario.targetTrainId).toBe('301')
    expect(actionPayload.session.selectedTrainId).toBe('301')

    await page.goto('/screen/line-map')
    const trainHotspot = page.locator('[data-testid^="train-hotspot-301-"]')

    await expect(trainHotspot).toHaveCount(1)
    await expect(trainHotspot).toHaveAttribute('data-status', 'WAIT')
    await page.waitForTimeout(3_000)
    await expect(trainHotspot).toHaveCount(1)

    const sessionResponse = await page.request.get('/api/session')
    const sessionPayload = await sessionResponse.json()

    expect(sessionPayload.session.activeScenario.targetTrainId).toBe('301')
    expect(errors).toEqual([])
  })
})
