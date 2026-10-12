import type { PublicUser, UserRole } from './accounts'
import { buildOccApiUrl, getOccBackendBaseUrl } from './backendClient'

// Sign-in from the browser. The token is kept per browser profile, so the
// trainee page and the three monitors on one PC share one sign-in.

export const AUTH_TOKEN_KEY = 'occ.auth.token.v1'

export class AuthRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function readAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function writeAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // Without storage the sign-in lasts until this page reloads.
  }
}

export function getAuthHeaders(token = readAuthToken()): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {}
}

// A signed-in request to the training server; throws AuthRequestError with the server's message.
export async function apiRequest<T>(path: string, options: { body?: unknown; method?: string; token?: string | null } = {}) {
  const baseUrl = getOccBackendBaseUrl()

  if (baseUrl === null) {
    throw new AuthRequestError('Backend API is disabled.', 0)
  }

  const response = await fetch(buildOccApiUrl(baseUrl, path), {
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...getAuthHeaders(options.token === undefined ? readAuthToken() : options.token),
    },
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
  })
  const payload = await response.json().catch(() => ({})) as T & { message?: string }

  if (!response.ok) {
    throw new AuthRequestError(payload.message ?? `Request failed (${response.status}).`, response.status)
  }

  return payload
}

type SignInResult = { token: string; user: PublicUser }

const request = apiRequest

export const authApi = {
  createUser: (account: { admin?: boolean; name: string; password: string; role: UserRole; username: string }) => (
    request<{ user: PublicUser }>('/api/users', { body: account })
  ),
  getStatus: () => request<{ needsSetup: boolean }>('/api/auth/status', { token: null }),
  listUsers: () => request<{ users: PublicUser[] }>('/api/users'),
  me: (token: string) => request<{ user: PublicUser }>('/api/auth/me', { token }),
  setup: (account: { name: string; password: string; username: string }) => (
    request<SignInResult>('/api/auth/setup', { body: account, token: null })
  ),
  signIn: (username: string, password: string) => (
    request<SignInResult>('/api/auth/login', { body: { password, username }, token: null })
  ),
  signOut: (token: string) => request<{ ok: boolean }>('/api/auth/logout', { body: {}, token }),
  updateUser: (id: string, changes: { admin?: boolean; disabled?: boolean; name?: string; password?: string }) => (
    request<{ user: PublicUser }>(`/api/users/${encodeURIComponent(id)}`, { body: changes, method: 'PATCH' })
  ),
}
