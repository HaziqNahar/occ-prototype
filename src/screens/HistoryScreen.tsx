import { useEffect, useState } from 'react'
import type { PublicUser } from '../accounts'
import AppShell from '../components/AppShell'
import SelectField from '../components/SelectField'
import { exerciseApi } from '../exerciseClient'
import type { TraineeAccount } from '../exerciseClient'
import { describeAction } from '../history'
import { getScenarioTaskPlaceTag } from '../iosScenarioRoles'
import type { RunDetail, RunSummary } from '../history'
import { downloadCsv, formatResult, formatRunTime, historyApi } from '../historyClient'
import { exportFileName, runsToCsv, runToCsv } from '../historyExport'
import type { AppRoute } from '../types'

type HistoryScreenProps = {
  onNavigate: (route: AppRoute, search?: string) => void
  onSignOut?: () => void
  user: PublicUser
}

const ALL_TRAINEES = ''

function historyTone(run: RunDetail) {
  if (!run.completed) return 'running'
  return run.result === 'PASS' ? 'pass' : 'review'
}

// One line under the run's title: when, how and how it went.
function summaryLine(run: RunDetail) {
  const hints = run.mode === 'PRACTICE' && run.aidsUsed ? run.aidsUsed.showMe + run.aidsUsed.locate : undefined

  return [
    formatRunTime(run.startedAt ?? run.completedAt),
    run.mode ? run.mode.charAt(0) + run.mode.slice(1).toLowerCase() : '',
    run.durationLabel ?? '',
    `${run.rejectedActions} wrong ${run.rejectedActions === 1 ? 'action' : 'actions'}`,
    hints === undefined ? '' : `${hints} ${hints === 1 ? 'hint' : 'hints'}`,
    run.exercise ? `Exercise ${run.exercise}` : '',
  ].filter(Boolean).join(' · ')
}

// What to debrief, from the saved run: refusals, missed steps and hints.
function discussPoints(run: RunDetail) {
  const points: Array<{ text: string; tone: 'bad' | 'info' }> = []
  const refusals = new Set(run.actions.filter((action) => action.accepted === false).map((action) => action.detail ?? describeAction(action.actionType)))

  refusals.forEach((text) => points.push({ text: `Refused: ${text}`, tone: 'bad' }))
  run.tasks
    .filter((task) => !task.complete && task.monitor !== 'IOS')
    .forEach((task) => points.push({ text: `${run.completed ? 'Missed' : 'Not done'}: ${task.label}${task.critical ? ' (critical)' : ''}`, tone: 'bad' }))

  if (run.mode === 'PRACTICE' && run.aidsUsed && run.aidsUsed.showMe + run.aidsUsed.locate > 0) {
    const total = run.aidsUsed.showMe + run.aidsUsed.locate

    points.push({ text: `Used hints ${total} ${total === 1 ? 'time' : 'times'} (Show me ${run.aidsUsed.showMe} · Locate ${run.aidsUsed.locate})`, tone: 'info' })
  }

  return points
}

function readParam(name: string) {
  return new URLSearchParams(window.location.search).get(name) ?? ''
}

// Keeps the chosen run and trainee in the address, so a link opens the same view.
function writeParams(params: Record<string, string>) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()

  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
}

// Past runs: each archived run with its score, checklist, notes and, from the
// action log, who did what and when. Trainees see only their own runs.
function HistoryScreen({ onNavigate, onSignOut, user }: HistoryScreenProps) {
  const isTrainer = user.role === 'trainer'
  const [traineeId, setTraineeId] = useState(() => (isTrainer ? readParam('trainee') : user.id))
  const [selectedId, setSelectedId] = useState(() => readParam('run'))
  const [runs, setRuns] = useState<RunSummary[] | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (isTrainer) {
      void exerciseApi.trainees().then((result) => setTrainees(result.trainees)).catch(() => undefined)
    }
  }, [isTrainer])

  useEffect(() => {
    void historyApi.runs(isTrainer ? traineeId || undefined : undefined)
      .then((result) => setRuns(result.runs))
      .catch((loadError: Error) => setError(loadError.message))
  }, [isTrainer, traineeId])

  useEffect(() => {
    writeParams({ run: selectedId, trainee: isTrainer ? traineeId : '' })

    if (!selectedId) {
      return
    }

    void historyApi.run(selectedId)
      .then((result) => setDetail(result.run))
      .catch((loadError: Error) => setError(loadError.message))
  }, [isTrainer, selectedId, traineeId])

  const shownDetail = detail?.id === selectedId ? detail : null

  return (
    <AppShell
      active="history"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="history-page"
      title={isTrainer ? 'Run history' : 'My runs'}
      user={user}
    >
      {error && <p className="trainer-console-notice is-warning" role="alert">{error}</p>}

      <div className="history-grid">
        <section className="trainer-console-panel" aria-labelledby="history-runs-heading">
          <div className="trainer-console-panel-head">
            <h2 id="history-runs-heading">Runs</h2>
            <span>{runs ? runs.length : '…'}</span>
            <button
              type="button"
              className="history-export"
              disabled={!runs?.length}
              onClick={() => downloadCsv(exportFileName('occ-runs', isTrainer ? traineeId || 'all' : user.id, new Date().toISOString().slice(0, 10)), runsToCsv(runs ?? []))}
            >
              Export CSV
            </button>
          </div>
          {isTrainer && (
            <label className="trainer-console-field">
              <span>Trainee</span>
              <SelectField
                ariaLabel="Trainee"
                value={traineeId}
                options={[{ label: 'All trainees', value: ALL_TRAINEES }, ...trainees.map((trainee) => ({ label: trainee.name, value: trainee.id }))]}
                onChange={(value) => {
                  setTraineeId(value)
                  setSelectedId('')
                }}
              />
            </label>
          )}
          {runs && runs.length === 0 && (
            <div className="trainer-console-empty">
              <strong>No runs yet</strong>
              <span>Completed runs appear here, scored by the server.</span>
            </div>
          )}
          <ul className="history-runs">
            {(runs ?? []).map((run) => (
              <li key={run.id}>
                <button
                  aria-current={run.id === selectedId}
                  className={run.id === selectedId ? 'is-selected' : undefined}
                  onClick={() => setSelectedId(run.id)}
                  type="button"
                >
                  <strong>{run.scenarioTitle}</strong>
                  <span className={`history-result is-${run.result.toLowerCase().replace(/\s+/g, '-')}`}>
                    {formatResult(run.result)} · {run.score}%
                  </span>
                  <small>
                    {formatRunTime(run.startedAt ?? run.completedAt)}
                    {run.trainees.length > 0 && ` · ${run.trainees.map((trainee) => trainee.name).join(', ')}`}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="trainer-console-panel history-detail" aria-labelledby="history-detail-heading">
          {!shownDetail ? (
            <div className="trainer-console-empty">
              <strong id="history-detail-heading">Choose a run</strong>
              <span>Its checklist, notes and every action, with who did it, show here.</span>
            </div>
          ) : (
            <>
              <div className="history-scorecard">
                <div className={`report-result ${historyTone(shownDetail)}`}>
                  <span>{formatResult(shownDetail.result)}</span>
                  <strong>{shownDetail.score}%</strong>
                </div>
                <div>
                  <h2 id="history-detail-heading">{shownDetail.scenarioTitle}</h2>
                  <p className="history-summary">
                    {shownDetail.trainees.length > 0 ? shownDetail.trainees.map((trainee) => (
                      isTrainer
                        ? <button key={trainee.id} type="button" onClick={() => onNavigate('/progress', `?trainee=${encodeURIComponent(trainee.id)}`)}>{trainee.name}</button>
                        : <span key={trainee.id}>{trainee.name}</span>
                    )) : <span>No trainee</span>}
                    <span>{summaryLine(shownDetail)}</span>
                  </p>
                </div>
                <div className="history-export-row">
                  <button
                    type="button"
                    className="history-export"
                    onClick={() => downloadCsv(
                      exportFileName('occ-run', shownDetail.trainees.map((trainee) => trainee.id).join('-'), (shownDetail.startedAt ?? '').slice(0, 10), shownDetail.scenarioTitle),
                      runToCsv(shownDetail),
                    )}
                  >
                    Export CSV
                  </button>
                  <button type="button" className="history-export" onClick={() => window.print()}>Print / PDF</button>
                </div>
              </div>

              {shownDetail.notes && (
                <blockquote className="history-notes">
                  <strong>Trainer notes</strong>
                  <span>{shownDetail.notes}</span>
                </blockquote>
              )}

              <section className="report-discuss" aria-label="To discuss">
                <h3>To discuss</h3>
                {discussPoints(shownDetail).length > 0 ? (
                  <ul>
                    {discussPoints(shownDetail).map((point) => <li className={`is-${point.tone}`} key={point.text}>{point.text}</li>)}
                  </ul>
                ) : (
                  <p className="tc-muted">{shownDetail.completed ? 'Nothing to flag: a clean run.' : 'Nothing to flag.'}</p>
                )}
              </section>

              <details className="report-fold">
                <summary>Steps · {shownDetail.tasks.filter((task) => task.complete).length} of {shownDetail.tasks.length} done</summary>
                <ol className="trainer-console-tasks">
                  {shownDetail.tasks.map((task) => (
                    <li className={task.complete ? 'is-done' : ''} key={task.label}>
                      <i aria-hidden="true">{task.complete ? '✓' : '✗'}</i>
                      <strong>{task.label}{task.critical && <b title="Critical SOP step"> ★</b>}</strong>
                      {task.monitor && <small className="trainer-console-task-tag">{getScenarioTaskPlaceTag(task.monitor)}</small>}
                    </li>
                  ))}
                </ol>
              </details>

              <details className="report-fold">
                <summary>All actions ({shownDetail.actions.length})</summary>
                <table className="people-table history-actions">
                  <thead>
                    <tr><th>Time</th><th>Who</th><th>Action</th><th>Result</th></tr>
                  </thead>
                  <tbody>
                    {shownDetail.actions.map((action, index) => (
                      <tr className={action.accepted === false ? 'is-refused' : undefined} key={`${action.at}-${index}`}>
                        <td>{new Date(action.at).toLocaleTimeString()}</td>
                        <td>{action.actor ?? '—'}{action.actorRole ? ` (${action.actorRole})` : ''}</td>
                        <td>{describeAction(action.actionType)}{action.subject && <small> · {action.subject}</small>}</td>
                        <td>{action.accepted === false ? `Refused${action.detail ? `: ${action.detail}` : ''}` : 'Done'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}

export default HistoryScreen
