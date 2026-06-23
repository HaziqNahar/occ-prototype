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
  const { createRouteAuditReport } = await server.ssrLoadModule('/scripts/audit-routes.ts')

  console.log(createRouteAuditReport())
} finally {
  await server.close()
}
