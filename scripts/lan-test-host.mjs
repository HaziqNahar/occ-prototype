// Runs the bundled training server on a fresh data folder for the LAN
// rehearsal test (playwright.lan.config.ts). The test builds into .lan-build/,
// not dist/ and dist-server/, so running it on the host PC never replaces the
// app a live training server is serving.
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const buildDir = path.resolve('.lan-build')
const dataDir = path.resolve('.playwright-lan-data')

await rm(dataDir, { force: true, recursive: true })

process.env.OCC_BACKEND_DATA_DIR = dataDir
process.env.OCC_BACKEND_HOST = '127.0.0.1'
process.env.OCC_BACKEND_PORT = process.env.OCC_LAN_TEST_PORT ?? '8799'
process.env.OCC_STATIC_DIR = path.join(buildDir, 'app')

await import(pathToFileURL(path.join(buildDir, 'server', 'main.js')).href)
