import { createServer } from 'vite'

const testModules = [
  '/scripts/tests/lineMapRailStateAuthority.test.ts',
  '/scripts/tests/lineMapRouteSegmentState.test.ts',
  '/scripts/tests/lineMapRoutePaths.test.ts',
  '/scripts/tests/lineMapRuntimeState.test.ts',
  '/scripts/tests/lineMapRouteState.test.ts',
  '/scripts/tests/nelTimetableData.test.ts',
  '/scripts/tests/railVisualState.test.ts',
  '/scripts/tests/routeValidation.test.ts',
  '/scripts/tests/routeAudit.test.ts',
  '/scripts/tests/scenarioWorkflow.test.ts',
  '/scripts/tests/signalRouteCommands.test.ts',
  '/scripts/tests/signalRouteState.test.ts',
  '/scripts/tests/timetablePlaybackController.test.ts',
  '/scripts/tests/timetablePlayback.test.ts',
  '/scripts/tests/timetablePlaybackScheduler.test.ts',
  '/scripts/tests/timetableDiagnostics.test.ts',
  '/scripts/tests/timetableMovementAuthority.test.ts',
  '/scripts/tests/timetableRouteAudit.test.ts',
  '/scripts/tests/timetableRouteStateCleanup.test.ts',
  '/scripts/tests/timetableServiceState.test.ts',
  '/scripts/tests/trainCommandState.test.ts',
  '/scripts/tests/trainMovementState.test.ts',
  '/scripts/tests/trainRoutePlaybackState.test.ts',
  '/scripts/tests/trainMovementRoutes.test.ts',
]

const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  root: process.cwd(),
  server: {
    middlewareMode: true,
  },
})

try {
  for (const testModule of testModules) {
    await server.ssrLoadModule(testModule)
  }

  console.log(`Passed ${testModules.length} test module${testModules.length === 1 ? '' : 's'}.`)
} finally {
  await server.close()
}
