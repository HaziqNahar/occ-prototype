import { createReadStream, existsSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { STATIC_DIR } from './config'

// Serves the built app (dist/) from the training server, so the LAN needs one
// address and one port. Addresses without a file (/ios/modules, /screen/...)
// get index.html; the app routes them.

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function sendFile(response: ServerResponse, file: string, cacheControl: string) {
  response.writeHead(200, {
    'cache-control': cacheControl,
    'content-length': statSync(file).size,
    'content-type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  })
  createReadStream(file).pipe(response)
}

export function serveStatic(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false
  }

  const index = path.join(STATIC_DIR, 'index.html')

  if (!existsSync(index)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('The training app is not built on this PC yet. Run: npm.cmd run build')
    return true
  }

  let decoded: string

  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }

  // Never outside the app folder.
  const file = path.resolve(STATIC_DIR, `.${path.posix.normalize(decoded)}`)

  if (file.startsWith(STATIC_DIR + path.sep) && existsSync(file) && statSync(file).isFile()) {
    // Built assets have a content hash in their name, so they never change.
    sendFile(response, file, file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
    return true
  }

  if (path.extname(decoded)) {
    return false
  }

  sendFile(response, index, 'no-cache')
  return true
}
