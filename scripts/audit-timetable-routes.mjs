import { createServer } from 'vite'

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
  const { createTimetableRouteAuditReport } = await server.ssrLoadModule('/scripts/audit-timetable-routes.ts')

  // Optional argument selects the timetable, e.g. NEL_OTES_Weekday_04.
  console.log(createTimetableRouteAuditReport(process.argv[2]))
} finally {
  await server.close()
}
