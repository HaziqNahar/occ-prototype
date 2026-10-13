import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { scheduleDailyBackups } from './backup'
import { BACKUP_DIR, DATA_DIR, HOST, PORT, STATIC_DIR } from './config'
import { AuthService } from './auth'
import { OccDatabase } from './database'
import { createRoutes } from './routes'
import { SessionStore } from './sessionStore'

// OCC training server: owns the training sessions, serves the app and the API
// on one port, and backs up its database daily. See docs/lan-setup.md.

const db = new OccDatabase()

db.migrateLegacyFiles()

const store = new SessionStore(db)
const server = createServer(createRoutes(db, store, new AuthService(db)))
const stopBackups = scheduleDailyBackups(db, (error) => console.error('Daily backup failed:', error))

// The addresses other PCs on the LAN can open.
function getLanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address && address.family === 'IPv4' && !address.internal)
    .map((address) => `http://${address!.address}:${PORT}/`)
}

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use. Is the training server already running?`
    : `The training server could not start: ${error.message}`)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`OCC training server listening on http://${HOST}:${PORT}/`)
  console.log(`  Data:    ${DATA_DIR}`)
  console.log(`  Backups: ${BACKUP_DIR}`)
  console.log(`  App:     ${STATIC_DIR}`)

  if (HOST === '0.0.0.0') {
    getLanAddresses().forEach((address) => console.log(`  Open on the other PCs: ${address}`))
  }
})

const shutdown = () => {
  stopBackups()
  server.close()
  store.flush()
  db.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
