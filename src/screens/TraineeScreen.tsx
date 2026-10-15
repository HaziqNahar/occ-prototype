import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { PublicUser } from '../accounts'
import AppShell from '../components/AppShell'
import { isRunActive, TRAINEE_END_RUN_REASON } from '../session-commands/runGuards'
import { normalizeEnteredSessionCode } from '../sessionCode'
import { getOnlineMonitors, occMonitors } from '../sessionPresence'
import type { AppRoute, OccSessionState } from '../types'
import type { DispatchSessionCommand } from '../useOccSession'
import { openOccMonitors } from '../occMonitors'

type TraineeScreenProps = {
  dispatch: DispatchSessionCommand
  onNavigate: (route: AppRoute) => void
  // Joins the exercise whose code was typed (the server finds it); without a
  // server, the code is checked against this page's session.
  onJoin?: (code: string) => Promise<{ accepted: boolean; reason: string | null }>
  onSignOut: () => void
  // No training server: no runs or progress to show.
  offline: boolean
  session: OccSessionState
  user: PublicUser
}

// Trainee view: join the trainer's session, then work on the three OCC monitors.
// It never reveals the incident, because finding it is part of the exercise.
function TraineeScreen({ dispatch, offline, onJoin, onNavigate, onSignOut, session, user }: TraineeScreenProps) {
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

  const [monitorProblem, setMonitorProblem] = useState('')
  const openMonitors = () => setMonitorProblem(openOccMonitors())

  const status = session.scenarioMode === 'RUNNING'
    ? { label: 'Exercise running', text: 'Work from your monitors, as per SOP.', tone: 'running' }
    : session.scenarioMode === 'PAUSED'
      ? { label: 'Paused', text: 'Wait for your trainer to resume.', tone: 'paused' }
      : session.scenarioMode === 'COMPLETE'
        ? { label: 'Exercise complete', text: 'Your trainer will go through the result with you.', tone: 'complete' }
        : { label: 'Waiting for trainer', text: 'Open your monitors now.', tone: 'idle' }
  const modeLabel = session.trainingMode.charAt(0) + session.trainingMode.slice(1).toLowerCase()

  return (
    <AppShell
      active="session"
      offline={offline}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="trainee-page"
      title={`Hello, ${joined?.name ?? user.name}`}
      user={user}
    >
      <section className="trainee-card" aria-label="Session">
        {!joined ? (
          <form className="trainee-join" onSubmit={join}>
            <label>
              <span>Session code from your trainer</span>
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

            <p className="trainee-facts">
              Exercise {session.sessionMeta.exercise ?? 1} · {modeLabel} · Code {sessionCode}
            </p>
            <div className="trainee-monitors">
              <ul aria-label="Your monitors">
                {occMonitors.map((monitor) => (
                  <li className={onlineMonitors.includes(monitor) ? 'is-online' : undefined} key={monitor.role}>
                    {monitor.label}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={openMonitors}>
                {onlineMonitors.length === occMonitors.length ? 'Bring monitors to front' : 'Open my monitors'}
              </button>
              {monitorProblem && <p className="trainee-error" role="alert">{monitorProblem}</p>}
            </div>
            {isRunActive(session)
              ? <small className="trainee-leave-note">{TRAINEE_END_RUN_REASON} You can leave once it is over.</small>
              : <button type="button" className="trainee-leave" onClick={leave}>Leave session</button>}
          </div>
        )}
      </section>
    </AppShell>
  )
}

export default TraineeScreen
