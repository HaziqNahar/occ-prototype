import { useEffect, useState } from 'react'
import type { PublicUser } from '../accounts'
import AppShell from '../components/AppShell'
import ResultPill from '../components/ResultPill'
import EmptyState from '../components/EmptyState'
import SelectField from '../components/SelectField'
import { SkeletonBlock } from '../components/Skeleton'
import { exerciseApi } from '../exerciseClient'
import type { TraineeAccount } from '../exerciseClient'
import { getRunTime } from '../history'
import type { RunSummary, TraineeProgress } from '../history'
import { downloadCsv, formatRunTime, historyApi } from '../historyClient'
import { exportFileName, progressToCsv } from '../historyExport'
import type { AppRoute } from '../types'

type ProgressScreenProps = {
  onNavigate: (route: AppRoute, search?: string) => void
  onSignOut?: () => void
  user: PublicUser
}

const TREND_RUNS = 20

// Scores of the last completed runs, oldest on the left: green dots passed,
// amber ones need review.
function ScoreTrend({ onOpen, runs }: { onOpen: (runId: string) => void; runs: RunSummary[] }) {
  const points = runs
    .filter((run) => run.completed)
    .slice(0, TREND_RUNS)
    .sort((left, right) => getRunTime(left).localeCompare(getRunTime(right)))

  if (points.length < 2) {
    return <p className="empty-note">The trend shows after two completed runs.</p>
  }

  const width = 1100
  const height = 200
  const pad = { bottom: 22, left: 34, right: 12, top: 12 }
  const x = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / (points.length - 1)
  const y = (score: number) => pad.top + ((100 - score) * (height - pad.top - pad.bottom)) / 100

  return (
    <>
      <svg className="score-trend" role="img" aria-label={`Scores of the last ${points.length} completed runs`} viewBox={`0 0 ${width} ${height}`}>
        {[0, 50, 100].map((score) => (
          <g key={score}>
            <line className="score-trend-grid" x1={pad.left} x2={width - pad.right} y1={y(score)} y2={y(score)} />
            <text className="score-trend-axis" x={pad.left - 8} y={y(score) + 4} textAnchor="end">{score}</text>
          </g>
        ))}
        <polyline className="score-trend-line" points={points.map((run, index) => `${x(index)},${y(run.score)}`).join(' ')} />
        {points.map((run, index) => {
          const [cx, cy] = [x(index), y(run.score)]
          const passed = run.result === 'PASS'
  
          return (
            <g className="score-trend-point" key={run.id} onClick={() => onOpen(run.id)}>
              <title>{`${run.scenarioTitle} · ${passed ? 'Pass' : 'Needs review'} · ${run.score}% · ${formatRunTime(getRunTime(run))}`}</title>
              <circle className="score-trend-hit" cx={cx} cy={cy} r={14} />
              {passed
                ? <circle className="score-trend-dot is-pass" cx={cx} cy={cy} r={6} />
                : <path className="score-trend-dot is-review" d={`M ${cx} ${cy - 8} L ${cx + 8} ${cy} L ${cx} ${cy + 8} L ${cx - 8} ${cy} Z`} />}
            </g>
          )
        })}
      </svg>
      <p className="score-trend-legend">
        <span><i className="is-pass" aria-hidden="true" /> Passed</span>
        <span><i className="is-review" aria-hidden="true" /> Needs review</span>
        <span>Click a point to open the run.</span>
      </p>
    </>
  )
}

// One trainee's record: totals, the score trend, each scenario's pass rate and
// recent runs. Trainees see their own; trainers choose.
function ProgressScreen({ onNavigate, onSignOut, user }: ProgressScreenProps) {
  const isTrainer = user.role === 'trainer'
  const [traineeId, setTraineeId] = useState(() => (
    isTrainer ? new URLSearchParams(window.location.search).get('trainee') ?? '' : user.id
  ))
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [traineesLoaded, setTraineesLoaded] = useState(false)
  const [progress, setProgress] = useState<TraineeProgress | null>(null)
  const [error, setError] = useState('')
  const chosenId = traineeId || (isTrainer ? trainees[0]?.id ?? '' : user.id)

  useEffect(() => {
    if (isTrainer) {
      void exerciseApi.trainees().then((result) => {
        setTrainees(result.trainees)
        setTraineesLoaded(true)
      }).catch(() => undefined)
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
  const passRate = totals?.completed ? Math.round((totals.passed / totals.completed) * 100) : 0

  return (
    <AppShell
      actions={shown && (
        <>
          <button type="button" onClick={() => downloadCsv(exportFileName('occ-progress', shown.trainee.id, new Date().toISOString().slice(0, 10)), progressToCsv(shown))}>
            Export CSV
          </button>
          <button type="button" onClick={() => window.print()}>Print / PDF</button>
        </>
      )}
      active="progress"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="history-page"
      subtitle={!isTrainer && shown ? shown.trainee.name : undefined}
      title={isTrainer ? 'Trainee progress' : 'My progress'}
      user={user}
    >
      {error && <p className="trainer-console-notice is-warning" role="alert">{error}</p>}

      {isTrainer && traineesLoaded && trainees.length === 0 ? (
        <section className="trainer-console-panel">
          <EmptyState
            action={user.admin && <button type="button" onClick={() => onNavigate('/admin')}>Go to People</button>}
            icon="people"
            text="Add trainee accounts on the People page; their progress shows here."
            title="No trainees yet"
          />
        </section>
      ) : isTrainer && (
        <div className="table-filters">
          <SelectField
            ariaLabel="Trainee"
            value={chosenId}
            options={trainees.map((trainee) => ({ label: trainee.name, value: trainee.id }))}
            onChange={setTraineeId}
          />
        </div>
      )}

      {chosenId && !shown && !error && (
        <>
          <div className="stat-tiles">
            {[0, 1, 2, 3].map((index) => <SkeletonBlock height={82} key={index} />)}
          </div>
          <SkeletonBlock height={240} />
        </>
      )}

      {shown && totals && (
        <>
          <section aria-label="Totals">
            <span className="visually-hidden">{shown.trainee.name}</span>
            <dl className="stat-tiles">
              <div><dt>Runs</dt><dd>{totals.runs}</dd></div>
              <div><dt>Completed</dt><dd>{totals.completed}</dd></div>
              <div>
                <dt>Passed</dt>
                <dd>{totals.passed}{totals.completed > 0 && <small> · {passRate}%</small>}</dd>
              </div>
              <div><dt>Average score</dt><dd>{totals.completed ? `${totals.averageScore}%` : '—'}</dd></div>
            </dl>
          </section>

          <section className="trainer-console-panel" aria-labelledby="progress-trend-heading">
            <h2 id="progress-trend-heading">Score over time</h2>
            <ScoreTrend onOpen={openRun} runs={shown.runs} />
          </section>

          <div className="progress-grid">
            <section className="trainer-console-panel" aria-labelledby="progress-scenarios-heading">
              <h2 id="progress-scenarios-heading">By scenario</h2>
              {shown.byScenario.length === 0 ? (
                <EmptyState icon="chart" text="Scores appear here once a run is completed." title="No completed runs yet" />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Scenario</th><th>Pass rate</th><th className="is-number">Best</th><th className="is-number">Average</th><th>Latest</th></tr>
                  </thead>
                  <tbody>
                    {shown.byScenario.map((scenario) => {
                      const rate = Math.round((scenario.passes / scenario.runs) * 100)

                      return (
                        <tr key={scenario.scenarioTitle}>
                          <td>{scenario.scenarioTitle}</td>
                          <td>
                            <div className="rate-bar" title={`${rate}%`}>
                              <span style={{ width: `${rate}%` }} />
                            </div>
                            <small className="rate-label">{scenario.passes} of {scenario.runs} passed</small>
                          </td>
                          <td className="is-number">{scenario.bestScore}%</td>
                          <td className="is-number">{scenario.averageScore}%</td>
                          <td title={formatRunTime(scenario.lastRunAt)}><ResultPill result={scenario.lastResult} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section className="trainer-console-panel" aria-labelledby="progress-runs-heading">
              <h2 id="progress-runs-heading">Recent runs</h2>
              {shown.runs.length === 0 ? (
                <p className="empty-note">No runs yet.</p>
              ) : (
                <ul className="recent-runs">
                  {shown.runs.slice(0, 10).map((run) => (
                    <li key={run.id}>
                      <button type="button" onClick={() => openRun(run.id)}>
                        <span>
                          <strong>{run.scenarioTitle}</strong>
                          <small>{formatRunTime(run.startedAt ?? run.completedAt)}</small>
                        </span>
                        <ResultPill completed={run.completed} result={run.result} />
                        <b>{run.score}%</b>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
}

export default ProgressScreen
