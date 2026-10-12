import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { getDisplayNameProblem, getPasswordProblem, getUsernameProblem, PASSWORD_MIN_LENGTH } from '../accounts'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'

type SignInPageProps = {
  message?: string
  // No accounts exist yet: create the first trainer, who becomes the admin.
  needsSetup: boolean
  onRetry: () => void
  onSetup: (account: { name: string; password: string; username: string }) => Promise<PublicUser>
  onSignIn: (username: string, password: string) => Promise<PublicUser>
  onSignedIn: (user: PublicUser) => void
  unreachable: boolean
}

function SignInPage({ message, needsSetup, onRetry, onSetup, onSignIn, onSignedIn, unreachable }: SignInPageProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const problem = needsSetup
      ? getDisplayNameProblem(name)
        ?? getUsernameProblem(username)
        ?? getPasswordProblem(password)
        ?? (password === confirm ? null : 'The two passwords do not match.')
      : (!username.trim() || !password ? 'Enter your username and password.' : null)

    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    setError('')

    try {
      onSignedIn(needsSetup ? await onSetup({ name, password, username }) : await onSignIn(username, password))
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Could not sign in.')
      setPassword('')
      setConfirm('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="trainee-shell" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <section className="trainee-card" aria-labelledby="sign-in-title">
        <header className="start-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>OCC Training Simulator</p>
            <h1 id="sign-in-title">{needsSetup ? 'Set up the first trainer' : 'Sign in'}</h1>
          </div>
        </header>

        {unreachable ? (
          <div className="trainee-join">
            <p className="trainee-error" role="alert">Cannot reach the training server. Check that it is running on the host PC.</p>
            <button type="button" onClick={onRetry}>Try again</button>
          </div>
        ) : (
          <form className="trainee-join" onSubmit={(event) => void submit(event)}>
            {needsSetup && (
              <p className="sign-in-note">
                This trainer becomes the admin, who adds the other trainers and the trainees.
              </p>
            )}
            {message && !needsSetup && <p className="sign-in-note">{message}</p>}
            {needsSetup && (
              <label>
                <span>Your name</span>
                <input autoComplete="name" onChange={(event) => setName(event.target.value)} value={name} />
              </label>
            )}
            <label>
              <span>Username</span>
              <input
                autoCapitalize="none"
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                spellCheck={false}
                value={username}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {needsSetup && (
              <label>
                <span>Password again</span>
                <input autoComplete="new-password" onChange={(event) => setConfirm(event.target.value)} type="password" value={confirm} />
              </label>
            )}
            {needsSetup && <p className="sign-in-note">At least {PASSWORD_MIN_LENGTH} characters.</p>}
            {error && <p className="trainee-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{needsSetup ? 'Create and sign in' : 'Sign in'}</button>
          </form>
        )}
      </section>
    </main>
  )
}

export default SignInPage
