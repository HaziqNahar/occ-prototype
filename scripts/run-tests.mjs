import { readdir } from 'node:fs/promises'
import { createServer } from 'vite'

const testModules = (await readdir(new URL('./tests/', import.meta.url)))
  .filter((fileName) => fileName.endsWith('.test.ts'))
  .sort()
  .map((fileName) => `/scripts/tests/${fileName}`)

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
