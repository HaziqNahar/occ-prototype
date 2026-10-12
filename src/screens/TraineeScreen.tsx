import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import { normalizeEnteredSessionCode, sessionCodesMatch } from '../sessionCode'
import { getOnlineMonitors, occMonitors } from '../sessionPresence'
import type { AppRoute, OccSessionState, TraineeParticipant } from '../types'

type TraineeScreenProps = {
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

const identityStorageKey = 'occ.trainee.identity.v1'
const traineeMonitor = 'Monitor 02 - Line Map'

const monitorWindows: Array<{ name: string; path: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
]

function readStoredIdentity() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(identityStorageKey) ?? 'null')

    return stored && typeof stored === 'object' && typeof (stored as { email?: unknown }).email === 'string'
      ? stored as { email: string; name: string }
      : null
  } catch {
    return null
  }
}

function writeStoredIdentity(identity: { email: string; name: string } | null) {
  try {
    if (identity) {
      localStorage.setItem(identityStorageKey, JSON.stringify(identity))
    } else {
      localStorage.removeItem(identityStorageKey)
    }
  } catch {
    // Without storage the trainee simply joins again after a reload.
  }
}

function toTraineeId(name: string) {
  return `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'trainee'}@trainee.local`
}

// Trainee view: join the trainer's session, then work on the three OCC monitors.
// It never reveals the incident, because finding it is part of the exercise.
function TraineeScreen({ session, updateSession }: TraineeScreenProps) {
  const [identity, setIdentity] = useState(readStoredIdentity)
  const [name, setName] = useState(identity?.name ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const sessionCode = session.sessionMeta?.code ?? ''
  const joined = identity ? session.trainees.find((trainee) => trainee.email === identity.email) : undefined
  const onlineMonitors = getOnlineMonitors(session, now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000)

    return () => window.clearInterval(timer)
  }, [])

  const join = (event: FormEvent) => {
    event.preventDefault()

    if (!name.trim()) {
      setError('Enter your name.')
      return
    }

    if (!sessionCodesMatch(code, sessionCode)) {
      setError('That code does not match. Check the code on your trainer’s screen.')
      return
    }

    const nextIdentity = { email: toTraineeId(name), name: name.trim() }
    const participant: TraineeParticipant = {
      email: nextIdentity.email,
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monitor: traineeMonitor,
      name: nextIdentity.name,
      role: 'Traffic Controller',
      status: 'Joined',
    }

    updateSession((current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence('Trainee', 'Trainee joined', 'info', `${participant.name} joined as Traffic Controller.`),
      ),
      trainees: [participant, ...current.trainees.filter((trainee) => trainee.email !== participant.email)].slice(0, 8),
    }))
    writeStoredIdentity(nextIdentity)
    setIdentity(nextIdentity)
    setError('')
  }

  const leave = () => {
    if (identity) {
      updateSession((current) => ({
        ...current,
        trainees: current.trainees.filter((trainee) => trainee.email !== identity.email),
      }))
    }

    writeStoredIdentity(null)
    setIdentity(null)
    setCode('')
  }

  const openMonitors = () => {
    monitorWindows.forEach((monitor) => window.open(monitor.path, monitor.name))
  }

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
            <h1 id="trainee-title">{joined ? `Hello, ${joined.name}` : 'Join a training session'}</h1>
          </div>
        </header>

        {!joined ? (
          <form className="trainee-join" onSubmit={join}>
            <label>
              <span>Your name</span>
              <input autoComplete="name" onChange={(event) => setName(event.target.value)} value={name} />
            </label>
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
      </section>
    </main>
  )
}

export default TraineeScreen
