import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SessionRunway from '../components/SessionRunway'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import type { AppRoute, OccSessionState, TraineeParticipant, TraineeRole } from '../types'

type TraineeLobbyScreenProps = {
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

const traineeRole: TraineeRole = 'Traffic Controller'
const traineeAssignment = 'Monitor 02 - Line Map'

function TraineeLobbyScreen({ session, updateSession }: TraineeLobbyScreenProps) {
  const [sessionCode, setSessionCode] = useState('OCC-317')
  const [name, setName] = useState('Trainee Controller')
  const [email, setEmail] = useState('trainee.controller@sbs.local')
  const [joinNote, setJoinNote] = useState('Enter session details and join the training roster.')

  const joinSession = () => {
    const participant: TraineeParticipant = {
      email,
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monitor: traineeAssignment,
      name,
      role: traineeRole,
      status: 'Joined',
    }

    updateSession((current) => ({
      ...current,
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Session Lobby',
          'Trainee joined',
          'info',
          `${name} joined as trainee operator. Assigned to ${traineeAssignment}.`,
        ),
      ),
      trainees: [
        participant,
        ...current.trainees.filter((trainee) => trainee.email !== email),
      ].slice(0, 8),
    }))
    setJoinNote(`${name} joined ${sessionCode}. Use the live OCC screens to perform assigned tasks.`)
  }

  const openOccMonitors = () => {
    const screens: Array<{ name: string; path: AppRoute }> = [
      { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
      { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
      { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
    ]

    screens.forEach((screen) => {
      window.open(screen.path, screen.name)
    })
  }

  return (
    <main
      className="module-tool-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="module-tool-header">
        <div className="module-tool-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Trainee Access</p>
            <h1>Session Lobby</h1>
            <span>{sessionCode} | {session.trainingMode}</span>
          </div>
        </div>
        <div className="module-tool-actions">
          <button type="button" onClick={openOccMonitors}>Open OCC Monitors</button>
        </div>
      </header>

      <SessionRunway session={session} variant="trainee" />

      <section className="lobby-layout">
        <section className="lobby-join-panel">
          <p className="module-eyebrow">Join Session</p>
          <h2>{session.activeScenario.title}</h2>
          <p className="module-copy">
            Session lobby for showing session enrolment, role assignment, and
            trainee readiness before using the live OCC operating screens.
          </p>

          <div className="lobby-form-grid">
            <label>
              <span>Session code</span>
              <input value={sessionCode} onChange={(event) => setSessionCode(event.target.value)} />
            </label>
            <label>
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          </div>

          <div className="lobby-assignment-card">
            <div>
              <span>Assigned monitor</span>
              <strong>{traineeAssignment}</strong>
            </div>
            <div>
              <span>Active incident</span>
              <strong>{session.activeScenario.incident}</strong>
            </div>
            <div>
              <span>Target duration</span>
              <strong>{session.activeScenario.duration}</strong>
            </div>
          </div>

          <div className="scenario-builder-actions">
            <button type="button" onClick={joinSession}>Join Training Session</button>
            <button type="button" onClick={openOccMonitors}>Open OCC Monitors</button>
          </div>

          <div className="scenario-builder-note">
            <strong>Lobby note</strong>
            <span>{joinNote}</span>
          </div>
        </section>

        <aside className="lobby-roster-panel">
          <p className="module-eyebrow">Session Roster</p>
          <h2>Participants</h2>
          <div className="lobby-roster-list">
            {session.trainees.map((trainee) => (
              <div className="lobby-roster-row" key={`${trainee.email}-${trainee.role}`}>
                <strong>{trainee.name}</strong>
                <span>{trainee.role}</span>
                <p>{trainee.monitor}</p>
                <em>{trainee.status} {trainee.joinedAt}</em>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default TraineeLobbyScreen
