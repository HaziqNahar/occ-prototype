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

  console.log(createTimetableRouteAuditReport())
} finally {
  await server.close()
}
