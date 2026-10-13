import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { normalizeEnteredSessionCode } from '../sessionCode'
import { getOnlineMonitors, occMonitors } from '../sessionPresence'
import type { OccSessionState } from '../types'
import type { DispatchSessionCommand } from '../useOccSession'
import { openOccMonitors } from '../occMonitors'

type TraineeScreenProps = {
  dispatch: DispatchSessionCommand
  // Opens the trainee's own progress (only with accounts).
  onOpenProgress?: () => void
  // Joins the exercise whose code was typed (the server finds it); without a
  // server, the code is checked against this page's session.
  onJoin?: (code: string) => Promise<{ accepted: boolean; reason: string | null }>
  onSignOut: () => void
  session: OccSessionState
  user: PublicUser
}

// Trainee view: join the trainer's session, then work on the three OCC monitors.
// It never reveals the incident, because finding it is part of the exercise.
function TraineeScreen({ dispatch, onJoin, onOpenProgress, onSignOut, session, user }: TraineeScreenProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const sessionCode = session.sessionMeta?.code ?? ''
  const joined = session.trainees.find((trainee) => trainee.email === user.id)
  const onlineMonitors = getOnlineMonitors(session, now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000)

    return () => window.clearInterval(timer)
  }, [])

  const join = (event: FormEvent) => {
    event.preventDefault()

    if (!code.trim()) {
      setError('Enter the code on your trainer’s screen.')
      return
    }

    setError('')
    void (onJoin ? onJoin(code) : dispatch({ code, type: 'TRAINEE_JOIN' }))
      .then(({ accepted, reason }) => {
        if (!accepted) {
          setError(reason ?? 'Could not join the session.')
        }
      })
      .catch((joinError: Error) => setError(joinError.message))
  }

  const leave = () => {
    void dispatch({ traineeId: user.id, type: 'TRAINEE_LEAVE' })
    setCode('')
  }

  const openMonitors = () => openOccMonitors()

  const status = session.scenarioMode === 'RUNNING'
    ? { label: 'Exercise running', text: 'Work from the OCC monitors. Respond to what you see as per SOP.', tone: 'running' }
    : session.scenarioMode === 'PAUSED'
      ? { label: 'Paused', text: 'Your trainer has paused the exercise. Wait for it to resume.', tone: 'paused' }
      : session.scenarioMode === 'COMPLETE'
        ? { label: 'Exercise complete', text: 'Well done. Your trainer will go through the results with you.', tone: 'complete' }
        : { label: 'Waiting for trainer', text: 'Open your monitors now. The exercise starts when your trainer loads a scenario.', tone: 'idle' }

  return (
    <main
      className="trainee-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <section className="trainee-card" aria-labelledby="trainee-title">
        <header className="start-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Trainee</p>
            <h1 id="trainee-title">{joined ? `Hello, ${joined.name}` : `Hello, ${user.name}`}</h1>
          </div>
        </header>

        {!joined ? (
          <form className="trainee-join" onSubmit={join}>
            <p className="sign-in-note">Join the training session with the code on your trainer’s screen.</p>
            <label>
              <span>Session code</span>
              <input
                autoCapitalize="characters"
                className="trainee-code-input"
                maxLength={8}
                onChange={(event) => setCode(normalizeEnteredSessionCode(event.target.value))}
                placeholder="e.g. K7M2"
                spellCheck={false}
                value={code}
              />
            </label>
            {error && <p className="trainee-error" role="alert">{error}</p>}
            <button type="submit">Join session</button>
          </form>
        ) : (
          <div className="trainee-joined">
            <div className={`trainee-status is-${status.tone}`} role="status">
              <strong>{status.label}</strong>
              <span>{status.text}</span>
            </div>

            <dl className="trainee-facts">
              <div><dt>Role</dt><dd>Traffic Controller</dd></div>
              <div><dt>Exercise</dt><dd>{session.sessionMeta.exercise ?? 1}</dd></div>
              <div><dt>Session</dt><dd>{sessionCode}</dd></div>
              <div><dt>Mode</dt><dd>{session.trainingMode.toLowerCase()}</dd></div>
            </dl>

            <div className="trainee-monitors">
              <span>Your monitors</span>
              <ul>
                {occMonitors.map((monitor) => (
                  <li className={onlineMonitors.includes(monitor) ? 'is-online' : undefined} key={monitor.role}>
                    {monitor.label}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={openMonitors}>
                {onlineMonitors.length === occMonitors.length ? 'Bring monitors to front' : 'Open my monitors'}
              </button>
            </div>

            <button type="button" className="trainee-leave" onClick={leave}>Leave session</button>
          </div>
        )}
        {onOpenProgress && <button type="button" className="trainee-leave" onClick={onOpenProgress}>My progress</button>}
        <button type="button" className="trainee-leave" onClick={onSignOut}>Sign out</button>
      </section>
    </main>
  )
}

export default TraineeScreen
