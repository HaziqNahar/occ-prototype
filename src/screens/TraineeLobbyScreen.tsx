import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import SessionRunway from '../components/SessionRunway'
import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import type { AppRoute, OccSessionState, TraineeParticipant, TraineeRole } from '../types'

type TraineeLobbyScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

const roleMonitorMap: Record<TraineeRole, { monitor: string; route: AppRoute }> = {
  'Traffic Controller': { monitor: 'Monitor 02 - Line Map', route: '/screen/line-map' },
  'Station Manager': { monitor: 'Monitor 01 - Alarms', route: '/screen/alarms' },
  Engineer: { monitor: 'Monitor 03 - Timetable', route: '/screen/timetable' },
  Observer: { monitor: 'IOS - Trainer Observation', route: '/ios' },
}

const traineeRoles = Object.keys(roleMonitorMap) as TraineeRole[]
const roleOptions = traineeRoles.map((item) => ({ label: item, value: item }))

function TraineeLobbyScreen({ onNavigate, session, updateSession }: TraineeLobbyScreenProps) {
  const [sessionCode, setSessionCode] = useState('OCC-317')
  const [name, setName] = useState('Trainee Controller')
  const [email, setEmail] = useState('trainee.controller@sbs.local')
  const [role, setRole] = useState<TraineeRole>('Traffic Controller')
  const [joinNote, setJoinNote] = useState('Enter session details and join the mock training roster.')
  const selectedAssignment = roleMonitorMap[role]

  const joinSession = () => {
    const participant: TraineeParticipant = {
      email,
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monitor: selectedAssignment.monitor,
      name,
      role,
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
          `${name} joined as ${role}. Assigned to ${selectedAssignment.monitor}.`,
        ),
      ),
      trainees: [
        participant,
        ...current.trainees.filter((trainee) => trainee.email !== email),
      ].slice(0, 8),
    }))
    setJoinNote(`${name} joined ${sessionCode} as ${role}. Assigned to ${selectedAssignment.monitor}.`)
  }

  return (
    <main
      className="prototype-tool-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="prototype-tool-header">
        <div className="prototype-tool-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Trainee Access</p>
            <h1>Session Lobby</h1>
            <span>{sessionCode} | {session.trainingMode}</span>
          </div>
        </div>
        <div className="prototype-tool-actions">
          <button type="button" onClick={() => onNavigate('/ios/modules')}>IOS Modules</button>
          <button type="button" onClick={() => onNavigate('/ios/scenarios')}>Scenario Builder</button>
          <button type="button" onClick={() => onNavigate(selectedAssignment.route)}>Open Assigned Screen</button>
        </div>
      </header>

      <SessionRunway session={session} />

      <section className="lobby-layout">
        <section className="lobby-join-panel">
          <p className="module-eyebrow">Join Session</p>
          <h2>{session.activeScenario.title}</h2>
          <p className="module-copy">
            Prototype lobby for showing session enrolment, role assignment, and
            future multi-crew provisioning without real multiplayer infrastructure.
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
            <label>
              <span>Role</span>
              <SelectField ariaLabel="Role" value={role} options={roleOptions} onChange={setRole} />
            </label>
          </div>

          <div className="lobby-assignment-card">
            <div>
              <span>Assigned monitor</span>
              <strong>{selectedAssignment.monitor}</strong>
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
            <button type="button" onClick={() => onNavigate(selectedAssignment.route)}>Open Assigned Screen</button>
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
