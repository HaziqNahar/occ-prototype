import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PublicUser } from '../accounts'
import AppShell from '../components/AppShell'
import ResultPill from '../components/ResultPill'
import SelectField from '../components/SelectField'
import SidePanel from '../components/SidePanel'
import { exerciseApi } from '../exerciseClient'
import type { TraineeAccount } from '../exerciseClient'
import { describeAction, getRunTime } from '../history'
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

type SortKey = 'date' | 'trainee' | 'scenario' | 'score'
type ResultFilter = 'all' | 'PASS' | 'NEEDS REVIEW' | 'open'

const ALL_TRAINEES = ''

const resultFilters: Array<{ label: string; value: ResultFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Pass', value: 'PASS' },
  { label: 'Needs review', value: 'NEEDS REVIEW' },
  { label: 'Not completed', value: 'open' },
]

function traineeNames(run: RunSummary) {
  return run.trainees.map((trainee) => trainee.name).join(', ')
}

function modeLabel(mode?: string) {
  return mode ? mode.charAt(0) + mode.slice(1).toLowerCase() : '—'
}

function matchesResult(run: RunSummary, filter: ResultFilter) {
  if (filter === 'all') return true
  if (filter === 'open') return !run.completed
  return run.completed && run.result === filter
}

function sortRuns(runs: RunSummary[], key: SortKey, ascending: boolean) {
  const value = (run: RunSummary) => (
    key === 'date' ? getRunTime(run)
      : key === 'trainee' ? traineeNames(run).toLowerCase()
        : key === 'scenario' ? run.scenarioTitle.toLowerCase()
          : String(run.score).padStart(3, '0')
  )

  return [...runs].sort((left, right) => (ascending ? 1 : -1) * value(left).localeCompare(value(right)))
}

// When, how and how it went, as short facts.
function summaryFacts(run: RunDetail) {
  const hints = run.mode === 'PRACTICE' && run.aidsUsed ? run.aidsUsed.showMe + run.aidsUsed.locate : undefined

  return [
    formatRunTime(run.startedAt ?? run.completedAt),
    run.mode ? modeLabel(run.mode) : '',
    run.durationLabel ?? '',
    `${run.rejectedActions} wrong ${run.rejectedActions === 1 ? 'action' : 'actions'}`,
    hints === undefined ? '' : `${hints} ${hints === 1 ? 'hint' : 'hints'}`,
    run.exercise ? `Exercise ${run.exercise}` : '',
  ].filter(Boolean)
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

// Past runs as one table to filter and sort; a run opens in a side panel with
// its result, what to debrief, its steps and every action. Trainees see only
// their own runs.
function HistoryScreen({ onNavigate, onSignOut, user }: HistoryScreenProps) {
  const isTrainer = user.role === 'trainer'
  const [traineeId, setTraineeId] = useState(() => (isTrainer ? readParam('trainee') : user.id))
  const [selectedId, setSelectedId] = useState(() => readParam('run'))
  const [runs, setRuns] = useState<RunSummary[] | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [error, setError] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ ascending: boolean; key: SortKey }>({ ascending: false, key: 'date' })
  const closeRun = useCallback(() => setSelectedId(''), [])

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
  const shownRuns = useMemo(() => {
    const text = search.trim().toLowerCase()

    return sortRuns(
      (runs ?? []).filter((run) => matchesResult(run, resultFilter)
        && (!text || run.scenarioTitle.toLowerCase().includes(text) || traineeNames(run).toLowerCase().includes(text))),
      sort.key,
      sort.ascending,
    )
  }, [resultFilter, runs, search, sort])

  const sortBy = (key: SortKey) => setSort((current) => (
    current.key === key ? { ascending: !current.ascending, key } : { ascending: key === 'trainee' || key === 'scenario', key }
  ))
  const header = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.ascending ? 'ascending' : 'descending') : undefined} className={key === 'score' ? 'is-number' : undefined}>
      <button type="button" className="table-sort" onClick={() => sortBy(key)}>
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.ascending ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  )

  return (
    <AppShell
      actions={(
        <button
          type="button"
          disabled={!runs?.length}
          onClick={() => downloadCsv(exportFileName('occ-runs', isTrainer ? traineeId || 'all' : user.id, new Date().toISOString().slice(0, 10)), runsToCsv(runs ?? []))}
        >
          Export CSV
        </button>
      )}
      active="history"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="history-page"
      title={isTrainer ? 'Run history' : 'My runs'}
      user={user}
    >
      {error && <p className="trainer-console-notice is-warning" role="alert">{error}</p>}

      <div className="table-filters" role="search" aria-label="Filter runs">
        {isTrainer && (
          <SelectField
            ariaLabel="Trainee"
            value={traineeId}
            options={[{ label: 'All trainees', value: ALL_TRAINEES }, ...trainees.map((trainee) => ({ label: trainee.name, value: trainee.id }))]}
            onChange={(value) => {
              setTraineeId(value)
              setSelectedId('')
            }}
          />
        )}
        <div className="segmented is-inline" role="radiogroup" aria-label="Result">
          {resultFilters.map((filter) => (
            <button
              aria-checked={resultFilter === filter.value}
              className={resultFilter === filter.value ? 'is-active' : undefined}
              key={filter.value}
              onClick={() => setResultFilter(filter.value)}
              role="radio"
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          aria-label="Search runs"
          className="table-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={isTrainer ? 'Search scenario or trainee' : 'Search scenario'}
          type="search"
          value={search}
        />
        <span className="table-count">{runs ? `${shownRuns.length} of ${runs.length}` : '…'}</span>
      </div>

      <section className="trainer-console-panel table-card" aria-label="Runs">
        {runs && runs.length === 0 ? (
          <div className="empty-state">
            <strong>No runs yet</strong>
            <span>Completed runs appear here, scored by the server.</span>
          </div>
        ) : runs && shownRuns.length === 0 ? (
          <div className="empty-state">
            <strong>No runs match</strong>
            <span>Try another filter.</span>
          </div>
        ) : (
          <table className="data-table history-runs">
            <thead>
              <tr>
                {header('date', 'Date')}
                {isTrainer && header('trainee', 'Trainee')}
                {header('scenario', 'Scenario')}
                <th>Mode</th>
                <th>Time</th>
                <th>Result</th>
                {header('score', 'Score')}
              </tr>
            </thead>
            <tbody>
              {shownRuns.map((run) => (
                <tr
                  aria-selected={run.id === selectedId}
                  className={run.id === selectedId ? 'is-selected' : undefined}
                  key={run.id}
                  onClick={() => setSelectedId(run.id)}
                >
                  <td className="is-muted">{formatRunTime(run.startedAt ?? run.completedAt)}</td>
                  {isTrainer && <td>{traineeNames(run) || '—'}</td>}
                  <td>
                    <button type="button" className="table-link" onClick={(event) => { event.stopPropagation(); setSelectedId(run.id) }}>
                      {run.scenarioTitle}
                    </button>
                  </td>
                  <td className="is-muted">{modeLabel(run.mode)}</td>
                  <td className="is-muted">{run.durationLabel ?? '—'}</td>
                  <td><ResultPill completed={run.completed} result={run.result} /></td>
                  <td className="is-number">{run.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedId && (
        <SidePanel
          actions={shownDetail && (
            <>
              <button
                type="button"
                onClick={() => downloadCsv(
                  exportFileName('occ-run', shownDetail.trainees.map((trainee) => trainee.id).join('-'), (shownDetail.startedAt ?? '').slice(0, 10), shownDetail.scenarioTitle),
                  runToCsv(shownDetail),
                )}
              >
                Export CSV
              </button>
              <button type="button" onClick={() => window.print()}>Print / PDF</button>
            </>
          )}
          className="history-detail"
          onClose={closeRun}
          title={shownDetail?.scenarioTitle ?? 'Loading…'}
          wide
        >
          {shownDetail && (
            <>
              <div className="history-scorecard">
                <div className={`report-result ${!shownDetail.completed ? 'running' : shownDetail.result === 'PASS' ? 'pass' : 'review'}`}>
                  <span>{formatResult(shownDetail.result)}</span>
                  <strong>{shownDetail.score}%</strong>
                </div>
                <div className="history-summary">
                  <p className="history-people">
                    {shownDetail.trainees.length > 0 ? shownDetail.trainees.map((trainee) => (
                      isTrainer
                        ? <button key={trainee.id} type="button" onClick={() => onNavigate('/progress', `?trainee=${encodeURIComponent(trainee.id)}`)}>{trainee.name}</button>
                        : <span key={trainee.id}>{trainee.name}</span>
                    )) : <span>No trainee</span>}
                  </p>
                  <ul className="fact-chips">
                    {summaryFacts(shownDetail).map((fact) => <li key={fact}>{fact}</li>)}
                  </ul>
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
                <table className="data-table history-actions">
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
        </SidePanel>
      )}
    </AppShell>
  )
}

export default HistoryScreen
