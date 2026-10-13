// Host PC data tools (see server/dataTools.ts):
//   npm.cmd run backup
//   npm.cmd run restore -- <backup file>
//   npm.cmd run reset:password -- <username> <new password>
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  // A one-off script: skip the browser dependency scan.
  optimizeDeps: { entries: [], noDiscovery: true },
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { hmr: false, middlewareMode: true, watch: null, ws: false },
})

try {
  const { runDataTool } = await vite.ssrLoadModule('/server/dataTools.ts')

  console.log(await runDataTool(process.argv.slice(2)))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await vite.close()
}
