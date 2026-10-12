// Resets an account's password on the host PC (see server/resetPassword.ts).
// Usage: npm.cmd run reset:password -- <username> <new password>
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
  const { resetPassword } = await vite.ssrLoadModule('/server/resetPassword.ts')

  console.log(await resetPassword(process.argv.slice(2)))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await vite.close()
}
