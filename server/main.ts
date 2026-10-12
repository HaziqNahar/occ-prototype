import { createServer } from 'node:http'
import { HOST, PORT } from './config'
import { AuthService } from './auth'
import { OccDatabase } from './database'
import { createRoutes } from './routes'
import { SessionStore } from './sessionStore'

// OCC training backend: owns the training session for the trainer console,
// trainee page and the three OCC monitors. See docs/production-plan.md.

const db = new OccDatabase()

db.migrateLegacyFiles()

const store = new SessionStore(db)
const server = createServer(createRoutes(db, store, new AuthService(db)))

server.listen(PORT, HOST, () => {
  console.log(`OCC session backend listening on http://${HOST}:${PORT}`)
})

const shutdown = () => {
  server.close()
  store.flush()
  db.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
