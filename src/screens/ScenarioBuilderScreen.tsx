import { useState } from 'react'
import type { CSSProperties } from 'react'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import SessionRunway from '../components/SessionRunway'
import { nelTimetableOptions } from '../data/nelTimetable'
import type { NelTimetableName } from '../data/nelTimetable'
import { scenarioTemplates } from '../scenarioLibrary'
import { appendScenarioEvidence, createEmptyScenarioTasks, createScenarioEvidence } from '../scenario'
import { createResetSessionState } from '../sessionState'
import { createTrainingScenarioStartSession, findTrainingScenarioDefinition } from '../trainingScenarios'
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

const visibleScenarioTemplateIds = new Set([
  'train-launch',
  'train-withdrawal',
  'door-fault',
  'psd-fault',
])

const visibleScenarioTemplates = scenarioTemplates.filter((scenario) => (
  visibleScenarioTemplateIds.has(scenario.id)
))

const draftStorageKey = 'occ.scenario-setup.draft.v1'

type ScenarioDraft = {
  selectedScenarioId: string
  trainingMode: TrainingMode
  customDuration: string
  selectedIncident: string
}

function readDraft(): ScenarioDraft | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(draftStorageKey) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const draft = raw as Partial<ScenarioDraft>
    const template = visibleScenarioTemplates.find((item) => item.id === draft.selectedScenarioId)
    if (!template || !trainingModeOptions.some((mode) => mode.value === draft.trainingMode)
      || typeof draft.customDuration !== 'string' || !/^\d{2}:[0-5]\d$/.test(draft.customDuration)
      || draft.customDuration === '00:00' || typeof draft.selectedIncident !== 'string' || !template.incidents.includes(draft.selectedIncident)) return null
    return draft as ScenarioDraft
  } catch {
    return null
  }
}

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
  const [draft] = useState(readDraft)
  const [selectedScenarioId, setSelectedScenarioId] = useState(draft?.selectedScenarioId ?? visibleScenarioTemplates[0].id)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(draft?.trainingMode ?? session.trainingMode)
  const [customDuration, setCustomDuration] = useState(draft?.customDuration ?? visibleScenarioTemplates[0].duration)
  const [selectedIncident, setSelectedIncident] = useState(draft?.selectedIncident ?? visibleScenarioTemplates[0].incidents[0])
  const [timetableName, setTimetableName] = useState<NelTimetableName>(session.timetableName)
  const timetableChanges = timetableName !== session.timetableName
  const selectedTimetable = nelTimetableOptions.find((option) => option.value === timetableName) ?? nelTimetableOptions[0]
  const [builderNote, setBuilderNote] = useState(draft ? 'Saved draft restored.' : '')
  const selectedScenario = scenarioTemplates.find((scenario) => scenario.id === selectedScenarioId) ?? scenarioTemplates[0]
  // Fault scenarios have one SOP variant per incident, so show that variant's own steps.
  const selectedDefinition = selectedScenario.trainingScenarioKind
    ? findTrainingScenarioDefinition(selectedScenario.trainingScenarioKind, selectedIncident)
    : undefined
  const operatorSteps = selectedDefinition?.tasks.map((task) => task.label) ?? selectedScenario.expectedSteps

  const durationIsValid = /^\d{2}:[0-5]\d$/.test(customDuration) && customDuration !== '00:00'
  const saveDraft = () => {
    if (!durationIsValid) return
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify({ selectedScenarioId, trainingMode, customDuration, selectedIncident }))
      setBuilderNote('Draft saved in this browser.')
    } catch {
      setBuilderNote('Could not save the draft. Browser storage is unavailable.')
    }
  }

  const selectScenario = (scenarioId: string) => {
    const nextScenario = scenarioTemplates.find((scenario) => scenario.id === scenarioId) ?? scenarioTemplates[0]

    setSelectedScenarioId(nextScenario.id)
    setCustomDuration(nextScenario.duration)
    setSelectedIncident(nextScenario.incidents[0])
    setBuilderNote('')
  }

  const loadScenarioToIos = () => {
    if (!durationIsValid) return
    const event = createBuilderEvent(`Scenario loaded: ${selectedScenario.title}`, trainingMode, 'yellow')

    updateSession((loaded) => {
      // A different timetable changes the train roster, so start from a clean session.
      const current = loaded.timetableName === timetableName
        ? loaded
        : createResetSessionState(trainingMode, Date.now(), (loaded.scenarioRevision ?? 0) + 1, timetableName)

      if (selectedScenario.trainingScenarioKind) {
        const armed = createTrainingScenarioStartSession(
          { ...current, trainingMode },
          selectedScenario.trainingScenarioKind,
          selectedIncident,
        )

        return {
          ...armed,
          activeScenario: {
            ...armed.activeScenario,
            duration: customDuration,
            incident: selectedIncident,
          },
          alarmSummaryRows: [createSummaryEvent(event), ...armed.alarmSummaryRows].slice(0, 12),
          evidenceLog: appendScenarioEvidence(
            armed.evidenceLog,
            createScenarioEvidence(
              'Scenario Builder',
              'Scenario loaded and armed',
              'info',
              `${selectedScenario.title} loaded in ${trainingMode}. Incident: ${selectedIncident}.`,
            ),
          ),
          eventRows: [event, ...armed.eventRows].slice(0, 4),
          scenarioNotice: {
            text: `${selectedScenario.title} loaded and armed in ${trainingMode} mode. ${armed.scenarioNotice.text}`,
            tone: 'info',
          },
        }
      }

      return {
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
      }
    })
    setBuilderNote(
      selectedScenario.trainingScenarioKind
        ? `${selectedScenario.title} loaded and armed in IOS as ${trainingMode}.`
        : `${selectedScenario.title} loaded into IOS as ${trainingMode}.`,
    )
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
      className="module-tool-shell scenario-setup-shell"
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="module-tool-header">
        <div className="module-tool-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Instructor station</p>
            <h1>Scenario setup</h1>
          </div>
        </div>
        <div className="module-tool-actions">
          <button type="button" onClick={() => onNavigate('/ios/modules')}>IOS Modules</button>
          <button type="button" onClick={() => onNavigate('/ios')}>Open IOS</button>
        </div>
      </header>

      <section className="scenario-builder-layout">
        <aside className="scenario-library-panel" aria-labelledby="scenario-choice-heading">
          <p className="module-eyebrow">Step 1</p>
          <h2 id="scenario-choice-heading">Choose scenario</h2>
          <div className="scenario-template-list">
            {visibleScenarioTemplates.map((scenario) => (
              <button
                type="button"
                aria-pressed={scenario.id === selectedScenario.id}
                className={scenario.id === selectedScenario.id ? 'is-selected' : ''}
                onClick={() => selectScenario(scenario.id)}
                key={scenario.id}
              >
                <strong>{scenario.title}</strong>
                <span>{scenario.objective}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="scenario-config-panel" aria-labelledby="scenario-settings-heading">
          <p className="module-eyebrow">Step 2</p>
          <h2 id="scenario-settings-heading">Set conditions</h2>
          <div className="scenario-config-grid">
            <label>
              <span>Training mode</span>
              <SelectField ariaLabel="Training mode" value={trainingMode} options={trainingModeOptions} onChange={(value) => { setTrainingMode(value); setBuilderNote('') }} />
            </label>
            <label>
              <span>Time target (mm:ss)</span>
              <input
                value={customDuration}
                aria-invalid={!durationIsValid}
                aria-describedby={!durationIsValid ? 'scenario-duration-error' : undefined}
                onChange={(event) => { setCustomDuration(event.target.value); setBuilderNote('') }}
              />
            </label>
          </div>
          {!durationIsValid && <p id="scenario-duration-error" role="alert">Enter a target from 00:01 to 99:59.</p>}
          <div className="scenario-config-grid">
            <label>
              <span>Timetable</span>
              <SelectField
                ariaLabel="Timetable"
                value={timetableName}
                options={nelTimetableOptions.map((option) => ({ label: `${option.label} (from ${option.effectiveFrom})`, value: option.value }))}
                onChange={(value) => { setTimetableName(value); setBuilderNote('') }}
              />
            </label>
            {selectedScenario.incidents.length > 1 && (
              <label>
                <span>Incident</span>
                <SelectField ariaLabel="Incident" value={selectedIncident} options={selectedScenario.incidents.map((incident) => ({ label: incident, value: incident }))} onChange={(value) => { setSelectedIncident(value); setBuilderNote('') }} />
              </label>
            )}
          </div>

          <section className="scenario-setup-review" aria-labelledby="scenario-review-heading">
            <p className="module-eyebrow">Step 3</p>
            <h2 id="scenario-review-heading">Review and load</h2>
            <dl className="scenario-setup-summary">
              <div><dt>Scenario</dt><dd>{selectedScenario.title}</dd></div>
              <div><dt>Mode / target time</dt><dd>{trainingModeOptions.find((mode) => mode.value === trainingMode)?.label} / {customDuration}</dd></div>
              <div><dt>Location / train</dt><dd>{selectedDefinition?.target ?? selectedScenario.target}</dd></div>
              <div><dt>Monitors</dt><dd>{selectedScenario.affectedMonitors.join(', ')}</dd></div>
              <div><dt>Timetable</dt><dd>{selectedTimetable.label}</dd></div>
            </dl>
            <p className="scenario-setup-hint">
              {timetableChanges
                ? `Loading switches the session to ${selectedTimetable.label} and resets all trains.`
                : 'Loading starts the scenario in the current session.'}
            </p>
            <div className="scenario-builder-actions">
              <button type="button" disabled={!durationIsValid} onClick={loadScenarioToIos}>Load Scenario to IOS</button>
              <button type="button" disabled={!durationIsValid} className="scenario-save-draft" onClick={saveDraft}>Save Draft</button>
            </div>
            <p className="scenario-setup-status" role="status">{builderNote}</p>
          </section>

          <details className="scenario-setup-details" key={selectedScenario.id}>
            <summary>Operator steps and assessment</summary>
            <p>{selectedScenario.passCondition}</p>
            <ol>{operatorSteps.map((step) => <li key={step}>{step}</li>)}</ol>
            <button type="button" onClick={() => onNavigate('/ios/assessment')}>View assessment rubric</button>
          </details>
          <details className="scenario-setup-details">
            <summary>Incident preview</summary>
            <p>Add “{selectedIncident}” to the live event feed.</p>
            <button type="button" disabled={!durationIsValid} onClick={pushIncidentPreview}>Push Incident Preview</button>
          </details>
        </section>
      </section>
      <details className="scenario-setup-details scenario-session-details">
        <summary>Current session: {session.activeScenario.title} · {session.scenarioMode}</summary>
        <SessionRunway session={session} />
      </details>
    </main>
  )
}

export default ScenarioBuilderScreen
