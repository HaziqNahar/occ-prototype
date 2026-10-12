import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_BODY_BYTES } from './config'

export class RequestError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export function setCorsHeaders(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'content-type')
  response.setHeader('Access-Control-Max-Age', '86400')
}

export function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  setCorsHeaders(response)
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload, null, 2))
}

export async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    totalBytes += buffer.length

    if (totalBytes > MAX_BODY_BYTES) {
      throw new RequestError('Request body is too large.', 413)
    }

    chunks.push(buffer)
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()

  if (!body) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(body)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    throw new RequestError('Request body is not valid JSON.')
  }
}

export function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getIsoNow() {
  return new Date().toISOString()
}
