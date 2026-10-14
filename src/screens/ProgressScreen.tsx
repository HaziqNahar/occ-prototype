import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import SelectField from '../components/SelectField'
import { exerciseApi } from '../exerciseClient'
import type { TraineeAccount } from '../exerciseClient'
import type { TraineeProgress } from '../history'
import { downloadCsv, formatResult, formatRunTime, historyApi } from '../historyClient'
import { exportFileName, progressToCsv } from '../historyExport'
import type { AppRoute } from '../types'

type ProgressScreenProps = {
  onNavigate: (route: AppRoute, search?: string) => void
  user: PublicUser
}

// One trainee's record across completed runs: totals, each scenario's best and
// latest result, and recent runs. Trainees see their own; trainers choose.
function ProgressScreen({ onNavigate, user }: ProgressScreenProps) {
  const isTrainer = user.role === 'trainer'
  const [traineeId, setTraineeId] = useState(() => (
    isTrainer ? new URLSearchParams(window.location.search).get('trainee') ?? '' : user.id
  ))
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [progress, setProgress] = useState<TraineeProgress | null>(null)
  const [error, setError] = useState('')
  const chosenId = traineeId || (isTrainer ? trainees[0]?.id ?? '' : user.id)

  useEffect(() => {
    if (isTrainer) {
      void exerciseApi.trainees().then((result) => setTrainees(result.trainees)).catch(() => undefined)
    }
  }, [isTrainer])

  useEffect(() => {
    if (!chosenId) {
      return
    }

    if (isTrainer) {
      window.history.replaceState(null, '', `/progress?trainee=${encodeURIComponent(chosenId)}`)
    }

    void historyApi.progress(isTrainer ? chosenId : undefined)
      .then((result) => {
        setProgress(result.progress)
        setError('')
      })
      .catch((loadError: Error) => setError(loadError.message))
  }, [chosenId, isTrainer])

  const shown = progress?.trainee.id === chosenId ? progress : null
  const totals = shown?.totals
  const openRun = (runId: string) => onNavigate(
    '/history',
    `?run=${encodeURIComponent(runId)}${isTrainer ? `&trainee=${encodeURIComponent(chosenId)}` : ''}`,
  )

  return (
    <main className="trainer-console history-page" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <header className="trainer-console-header">
        <div className="trainer-console-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>{isTrainer ? `Instructor station · ${user.name}` : user.name}</p>
            <h1>{isTrainer ? 'Trainee progress' : 'My progress'}</h1>
          </div>
        </div>
        {error && <p className="trainer-console-message" role="alert">{error}</p>}
        <nav aria-label="Progress tools">
          {shown && (
            <>
              <button type="button" onClick={() => downloadCsv(exportFileName('occ-progress', shown.trainee.id, new Date().toISOString().slice(0, 10)), progressToCsv(shown))}>
                Export CSV
              </button>
              <button type="button" onClick={() => window.print()}>Print / PDF</button>
            </>
          )}
          <button type="button" onClick={() => onNavigate('/history', isTrainer && chosenId ? `?trainee=${encodeURIComponent(chosenId)}` : '')}>
            {isTrainer ? 'Run history' : 'My runs'}
          </button>
          <button type="button" className="is-quiet" onClick={() => onNavigate(isTrainer ? '/ios/modules' : '/session/join')}>
            {isTrainer ? 'Trainer Console' : 'Back'}
          </button>
        </nav>
      </header>

      {(isTrainer || (shown && totals)) && (
        <section className="trainer-console-panel progress-summary" aria-label="Totals">
          {isTrainer ? (
            <SelectField
              ariaLabel="Trainee"
              value={chosenId}
              options={trainees.map((trainee) => ({ label: trainee.name, value: trainee.id }))}
              onChange={setTraineeId}
            />
          ) : shown && <strong>{shown.trainee.name}</strong>}
          {isTrainer && trainees.length === 0 && <span>No trainee accounts yet. Add them on the People page.</span>}
          {totals && (
            <span>
              {totals.runs} {totals.runs === 1 ? 'run' : 'runs'} on record · {totals.completed} completed · {totals.passed} passed
              {totals.completed ? ` · average ${totals.averageScore}%` : ''}
            </span>
          )}
        </section>
      )}

      {shown && totals && (
        <>
          <div className="history-grid progress-grid">
            <section className="trainer-console-panel" aria-labelledby="progress-scenarios-heading">
              <h2 id="progress-scenarios-heading">By scenario</h2>
              {shown.byScenario.length === 0 ? (
                <div className="trainer-console-empty">
                  <strong>No completed runs yet</strong>
                  <span>Scores appear here once a run is completed.</span>
                </div>
              ) : (
                <table className="people-table">
                  <thead>
                    <tr><th>Scenario</th><th>Runs</th><th>Passed</th><th>Best</th><th>Average</th><th>Latest</th></tr>
                  </thead>
                  <tbody>
                    {shown.byScenario.map((scenario) => (
                      <tr key={scenario.scenarioTitle}>
                        <td>{scenario.scenarioTitle}</td>
                        <td>{scenario.runs}</td>
                        <td>{scenario.passes}</td>
                        <td>{scenario.bestScore}%</td>
                        <td>{scenario.averageScore}%</td>
                        <td title={formatRunTime(scenario.lastRunAt)}>{formatResult(scenario.lastResult)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="trainer-console-panel" aria-labelledby="progress-runs-heading">
              <h2 id="progress-runs-heading">Recent runs</h2>
              <ul className="history-runs">
                {shown.runs.slice(0, 20).map((run) => (
                  <li key={run.id}>
                    <button type="button" onClick={() => openRun(run.id)}>
                      <strong>{run.scenarioTitle}</strong>
                      <span className={`history-result is-${run.result.toLowerCase().replace(/\s+/g, '-')}`}>
                        {formatResult(run.result)} · {run.score}%
                      </span>
                      <small>{formatRunTime(run.startedAt ?? run.completedAt)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  )
}

export default ProgressScreen
