import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import SessionRunway from '../components/SessionRunway'
import { prototypeScenarios } from '../prototypeData'
import { appendScenarioEvidence, createEmptyScenarioTasks, createScenarioEvidence } from '../scenario'
import type { AlarmSummaryRow, AppRoute, MonitorAlarmRow, OccSessionState, TrainingMode } from '../types'

type ScenarioBuilderScreenProps = {
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
  updateSession: (updater: (current: OccSessionState) => OccSessionState) => void
}

const trainingModeOptions: Array<{ label: string; value: TrainingMode }> = [
  { label: 'Practice', value: 'PRACTICE' },
  { label: 'Assessment', value: 'ASSESSMENT' },
  { label: 'Player', value: 'PLAYER' },
]

function formatScenarioTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `05/11 ${hours}:${minutes}:${seconds}`
}

function createBuilderEvent(message: string, value: string, tone: MonitorAlarmRow['tone'] = 'yellow'): MonitorAlarmRow {
  return {
    level: 'S',
    time: formatScenarioTime(),
    asset: 'IOS/SCENARIO/BUILDER',
    message,
    value,
    tone,
  }
}

function createSummaryEvent(event: MonitorAlarmRow, tone: AlarmSummaryRow['tone'] = 'yellow'): AlarmSummaryRow {
  return {
    ack: 'Y',
    avl: '',
    mms: 'S',
    timestamp: event.time.replace('05/11 ', '05/11/25 '),
    asset: event.asset,
    description: event.message,
    value: event.value,
    tone,
  }
}

function ScenarioBuilderScreen({ onNavigate, session, updateSession }: ScenarioBuilderScreenProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(prototypeScenarios[0].id)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(session.trainingMode)
  const [customDuration, setCustomDuration] = useState(prototypeScenarios[0].duration)
  const [selectedIncident, setSelectedIncident] = useState(prototypeScenarios[0].incidents[0])
  const [builderNote, setBuilderNote] = useState('Scenario builder ready. Select a template and load it into IOS.')
  const selectedScenario = prototypeScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? prototypeScenarios[0]

  const selectScenario = (scenarioId: string) => {
    const nextScenario = prototypeScenarios.find((scenario) => scenario.id === scenarioId) ?? prototypeScenarios[0]

    setSelectedScenarioId(nextScenario.id)
    setCustomDuration(nextScenario.duration)
    setSelectedIncident(nextScenario.incidents[0])
    setBuilderNote(`${nextScenario.title} selected for configuration.`)
  }

  const loadScenarioToIos = () => {
    const event = createBuilderEvent(`Scenario loaded: ${selectedScenario.title}`, trainingMode, 'yellow')

    updateSession((current) => ({
      ...current,
      activeScenario: {
        duration: customDuration,
        id: selectedScenario.id,
        incident: selectedIncident,
        target: selectedScenario.target,
        title: selectedScenario.title,
      },
      alarmSummaryRows: [createSummaryEvent(event), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: [
        createScenarioEvidence(
          'Scenario Builder',
          'Scenario loaded',
          'info',
          `${selectedScenario.title} loaded in ${trainingMode}. Incident: ${selectedIncident}.`,
        ),
      ],
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioMode: 'IDLE',
      scenarioNotice: {
        text: `${selectedScenario.title} loaded in ${trainingMode} mode. Target ${selectedScenario.target}.`,
        tone: 'info',
      },
      scenarioStep: 0,
      scenarioTasks: createEmptyScenarioTasks(),
      selectedTrainId: '317',
      trainingMode,
    }))
    setBuilderNote(`${selectedScenario.title} loaded into IOS as ${trainingMode}.`)
  }

  const pushIncidentPreview = () => {
    const event = createBuilderEvent(
      `Scenario template incident prepared: ${selectedIncident}`,
      'READY',
      selectedIncident.toLowerCase().includes('fault') || selectedIncident.toLowerCase().includes('malfunction') ? 'red' : 'yellow',
    )

    updateSession((current) => ({
      ...current,
      activeScenario: {
        duration: customDuration,
        id: selectedScenario.id,
        incident: selectedIncident,
        target: selectedScenario.target,
        title: selectedScenario.title,
      },
      alarmSummaryRows: [createSummaryEvent(event, event.tone === 'red' ? 'red' : 'yellow'), ...current.alarmSummaryRows].slice(0, 12),
      evidenceLog: appendScenarioEvidence(
        current.evidenceLog,
        createScenarioEvidence(
          'Scenario Builder',
          'Incident preview pushed',
          event.tone === 'red' ? 'accepted' : 'info',
          selectedIncident,
        ),
      ),
      eventRows: [event, ...current.eventRows].slice(0, 4),
      scenarioNotice: {
        text: `${selectedIncident} prepared from Scenario Builder.`,
        tone: event.tone === 'red' ? 'warning' : 'info',
      },
    }))
    setBuilderNote(`${selectedIncident} prepared and pushed into the live event feed.`)
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
            <p>IOS Scenario Management</p>
            <h1>Scenario Builder</h1>
            <span>{selectedScenario.status} | {trainingMode}</span>
          </div>
        </div>
        <div className="prototype-tool-actions">
          <button type="button" onClick={() => onNavigate('/ios/modules')}>IOS Modules</button>
          <button type="button" onClick={() => onNavigate('/ios/assessment')}>Assessment Rubric</button>
          <button type="button" onClick={() => onNavigate('/ios')}>Open IOS</button>
        </div>
      </header>

      <SessionRunway session={session} />

      <section className="scenario-builder-layout">
        <aside className="scenario-library-panel">
          <p className="module-eyebrow">Scenario Library</p>
          <h2>Available Templates</h2>
          <div className="scenario-template-list">
            {prototypeScenarios.map((scenario) => (
              <button
                type="button"
                className={scenario.id === selectedScenario.id ? 'is-selected' : ''}
                onClick={() => selectScenario(scenario.id)}
                key={scenario.id}
              >
                <strong>{scenario.title}</strong>
                <span>{scenario.status}</span>
                <em>{scenario.duration} target</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="scenario-config-panel">
          <div className="scenario-config-hero">
            <div>
              <p className="module-eyebrow">Selected Scenario</p>
              <h2>{selectedScenario.title}</h2>
              <p>{selectedScenario.objective}</p>
            </div>
            <div className="scenario-target-card">
              <span>Target</span>
              <strong>{selectedScenario.target}</strong>
              <small>{selectedScenario.passCondition}</small>
            </div>
          </div>

          <div className="scenario-config-grid">
            <label>
              <span>Training mode</span>
              <SelectField
                ariaLabel="Training mode"
                value={trainingMode}
                options={trainingModeOptions}
                onChange={setTrainingMode}
              />
            </label>
            <label>
              <span>Rectification target</span>
              <input value={customDuration} onChange={(event) => setCustomDuration(event.target.value)} />
            </label>
            <label>
              <span>Incident preview</span>
              <SelectField
                ariaLabel="Incident preview"
                value={selectedIncident}
                options={selectedScenario.incidents.map((incident) => ({ label: incident, value: incident }))}
                onChange={setSelectedIncident}
              />
            </label>
          </div>

          <div className="scenario-detail-grid">
            <article>
              <h3>Affected monitors</h3>
              <div className="scenario-pill-row">
                {selectedScenario.affectedMonitors.map((monitor) => (
                  <span key={monitor}>{monitor}</span>
                ))}
              </div>
            </article>
            <article>
              <h3>Incident list</h3>
              <div className="scenario-pill-row">
                {selectedScenario.incidents.map((incident) => (
                  <span key={incident}>{incident}</span>
                ))}
              </div>
            </article>
          </div>

          <article className="scenario-steps-panel">
            <h3>Expected operator steps</h3>
            {selectedScenario.expectedSteps.map((step, index) => (
              <div className="scenario-step-row" key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </div>
            ))}
          </article>

          <div className="scenario-builder-actions">
            <button type="button" onClick={loadScenarioToIos}>Load Scenario to IOS</button>
            <button type="button" onClick={pushIncidentPreview}>Push Incident Preview</button>
            <button type="button" onClick={() => setBuilderNote('Template duplicated for prototype demonstration.')}>Duplicate Template</button>
            <button type="button" onClick={() => setBuilderNote('Scenario draft saved locally for prototype demonstration.')}>Save Draft</button>
          </div>

          <div className="scenario-builder-note">
            <strong>Builder note</strong>
            <span>{builderNote}</span>
          </div>
        </section>
      </section>
    </main>
  )
}

export default ScenarioBuilderScreen
