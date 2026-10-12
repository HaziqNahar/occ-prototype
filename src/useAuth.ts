import { useCallback, useEffect, useState } from 'react'
import type { PublicUser } from './accounts'
import { AUTH_TOKEN_KEY, authApi, AuthRequestError, readAuthToken, writeAuthToken } from './authClient'
import { getOccBackendBaseUrl } from './backendClient'

// Who is signed in to this browser. Every window follows the same sign-in:
// signing in or out in one window updates the others.

export type AuthState =
  | { status: 'loading' }
  // No backend configured (VITE_OCC_API_BASE=disabled): pages run without accounts.
  | { status: 'local' }
  | { status: 'needs-setup' }
  | { message?: string; status: 'signed-out' }
  | { status: 'signed-in'; token: string; user: PublicUser }
  | { status: 'unreachable' }

async function loadAuthState(): Promise<AuthState> {
  if (getOccBackendBaseUrl() === null) {
    return { status: 'local' }
  }

  const token = readAuthToken()

  try {
    if (token) {
      try {
        return { status: 'signed-in', token, user: (await authApi.me(token)).user }
      } catch (error) {
        if (!(error instanceof AuthRequestError) || error.status !== 401) {
          throw error
        }

        writeAuthToken(null)
      }
    }

    return (await authApi.getStatus()).needsSetup ? { status: 'needs-setup' } : { status: 'signed-out' }
  } catch {
    return { status: 'unreachable' }
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const reload = useCallback(() => {
    void loadAuthState().then(setState)
  }, [])

  useEffect(() => {
    reload()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY || event.key === null) {
        reload()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => window.removeEventListener('storage', handleStorage)
  }, [reload])

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await authApi.signIn(username, password)

    writeAuthToken(result.token)
    setState({ status: 'signed-in', token: result.token, user: result.user })

    return result.user
  }, [])

  const setup = useCallback(async (account: { name: string; password: string; username: string }) => {
    const result = await authApi.setup(account)

    writeAuthToken(result.token)
    setState({ status: 'signed-in', token: result.token, user: result.user })

    return result.user
  }, [])

  const signOut = useCallback(async () => {
    const token = readAuthToken()

    writeAuthToken(null)
    setState({ status: 'signed-out' })

    if (token) {
      await authApi.signOut(token).catch(() => undefined)
    }
  }, [])

  // The server no longer accepts this sign-in (expired, password reset, account switched off).
  const handleSignedOut = useCallback(() => {
    writeAuthToken(null)
    setState({ message: 'You have been signed out. Sign in again.', status: 'signed-out' })
  }, [])

  return { handleSignedOut, reload, setup, signIn, signOut, state }
}
