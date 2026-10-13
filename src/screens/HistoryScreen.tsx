import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import { exerciseApi } from '../exerciseClient'
import type { TraineeAccount } from '../exerciseClient'
import { describeAction } from '../history'
import type { RunDetail, RunSummary } from '../history'
import { downloadCsv, formatResult, formatRunTime, historyApi } from '../historyClient'
import { exportFileName, runsToCsv, runToCsv } from '../historyExport'
import type { AppRoute } from '../types'

type HistoryScreenProps = {
  onNavigate: (route: AppRoute, search?: string) => void
  user: PublicUser
}

const ALL_TRAINEES = ''

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
function HistoryScreen({ onNavigate, user }: HistoryScreenProps) {
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
    <main className="trainer-console history-page" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <header className="trainer-console-header">
        <div className="trainer-console-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>{isTrainer ? `Instructor station · ${user.name}` : user.name}</p>
            <h1>{isTrainer ? 'Run history' : 'My runs'}</h1>
          </div>
        </div>
        {error && <p className="trainer-console-message" role="alert">{error}</p>}
        <nav aria-label="History tools">
          <button type="button" onClick={() => onNavigate('/progress', isTrainer && traineeId ? `?trainee=${encodeURIComponent(traineeId)}` : '')}>
            {isTrainer ? 'Trainee progress' : 'My progress'}
          </button>
          <button type="button" className="is-quiet" onClick={() => onNavigate(isTrainer ? '/ios/modules' : '/session/join')}>
            {isTrainer ? 'Trainer Console' : 'Back'}
          </button>
        </nav>
      </header>

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
              <div className="trainer-console-panel-head">
                <h2 id="history-detail-heading">{shownDetail.scenarioTitle}</h2>
                <span>{formatRunTime(shownDetail.startedAt ?? shownDetail.completedAt)}</span>
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
              <dl className="trainer-console-figures">
                <div><dt>Result</dt><dd>{formatResult(shownDetail.result)}</dd></div>
                <div><dt>Score</dt><dd>{shownDetail.score}%</dd></div>
                <div><dt>Time</dt><dd>{shownDetail.durationLabel ?? '—'}</dd></div>
                <div><dt>Wrong actions</dt><dd className={shownDetail.rejectedActions > 0 ? 'is-bad' : undefined}>{shownDetail.rejectedActions}</dd></div>
              </dl>
              <p className="history-facts">
                {shownDetail.trainees.length > 0 ? shownDetail.trainees.map((trainee) => (
                  isTrainer
                    ? <button key={trainee.id} type="button" onClick={() => onNavigate('/progress', `?trainee=${encodeURIComponent(trainee.id)}`)}>{trainee.name}</button>
                    : <span key={trainee.id}>{trainee.name}</span>
                )) : 'No trainee joined'}
                {shownDetail.exercise && <span>Exercise {shownDetail.exercise}</span>}
                {shownDetail.sessionCode && <span>Code {shownDetail.sessionCode}</span>}
                {shownDetail.mode && <span>{shownDetail.mode.toLowerCase()}</span>}
              </p>
              {shownDetail.notes && (
                <blockquote className="history-notes">
                  <strong>Trainer notes</strong>
                  <span>{shownDetail.notes}</span>
                </blockquote>
              )}

              <h3>Checklist</h3>
              <ol className="trainer-console-tasks">
                {shownDetail.tasks.map((task) => (
                  <li className={task.complete ? 'is-done' : ''} key={task.label}>
                    <i aria-hidden="true">{task.complete ? '✓' : '✗'}</i>
                    <div>
                      <strong>{task.label}{task.critical && <b title="Critical SOP step"> ★</b>}</strong>
                      {task.monitor && <small>{task.monitor}</small>}
                    </div>
                  </li>
                ))}
              </ol>

              <h3>Actions ({shownDetail.actions.length})</h3>
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
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default HistoryScreen
