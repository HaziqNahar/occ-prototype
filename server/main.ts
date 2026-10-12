import { createServer } from 'node:http'
import { HOST, PORT } from './config'
import { OccDatabase } from './database'
import { createRoutes } from './routes'

// OCC training backend: one shared session for the trainer console, trainee page
// and the three OCC monitors. See docs/production-plan.md.

const db = new OccDatabase()

db.migrateLegacyFiles()

const server = createServer(createRoutes(db))

server.listen(PORT, HOST, () => {
  console.log(`OCC session backend listening on http://${HOST}:${PORT}`)
})

const shutdown = () => {
  server.close()
  db.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
