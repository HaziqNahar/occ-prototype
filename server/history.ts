import type { OccDatabase } from './database'
import { describeActionSubject, getRunTime, summarizeProgress, toRunSummary, toRunTasks } from '../src/history'
import type { RunActionEntry, RunDetail, RunSummary, RunTrainee, TraineeProgress } from '../src/history'

// Past runs, read from the archived reports, with each run's commands from the
// action log. See docs/production-plan.md, phase 6.

// Log rows are written just after the session's own timestamps.
const RUN_WINDOW_SLACK_MS = 2000

// Notices are screen feedback (a menu opened), not actions worth a history line.
const UNLOGGED_HISTORY_ACTIONS = new Set(['SHOW_NOTICE'])

export function listRuns(db: OccDatabase): RunSummary[] {
  return db.listReports()
    .map(toRunSummary)
    .sort((left, right) => getRunTime(right).localeCompare(getRunTime(left)))
}

export function getRunDetail(db: OccDatabase, id: string): RunDetail | null {
  const report = db.getReport(id)

  if (!report) {
    return null
  }

  const run = toRunSummary(report)
  // The run's own LOAD_SCENARIO is logged just after its start time.
  const start = run.startedAt ? Date.parse(run.startedAt) : Number.NEGATIVE_INFINITY
  const endTime = run.completedAt ?? (typeof report.summary.generatedAt === 'string' ? report.summary.generatedAt : undefined)
  const end = endTime ? Date.parse(endTime) + RUN_WINDOW_SLACK_MS : Number.POSITIVE_INFINITY
  const inWindow = run.sessionId
    ? db.listActions(run.sessionId)
        .filter((row) => row.kind === 'command' && !UNLOGGED_HISTORY_ACTIONS.has(row.action_type ?? ''))
        .filter((row) => {
          const at = Date.parse(row.at)

          return at >= start && at <= end
        })
    : []
  // The run ends where the next one is loaded or the session is reset.
  const nextRun = inWindow.findIndex((row, index) => (
    index > 0 && row.accepted === 1 && (row.action_type === 'LOAD_SCENARIO' || row.action_type === 'RESET_SESSION')
  ))
  const actions: RunActionEntry[] = (nextRun > 0 ? inWindow.slice(0, nextRun) : inWindow).map((row) => ({
    accepted: row.accepted === null ? null : row.accepted === 1,
    actionType: row.action_type,
    actor: row.actor,
    actorRole: row.actor_role,
    at: row.at,
    detail: row.detail,
    subject: row.payload ? describeActionSubject(JSON.parse(row.payload)) : undefined,
  }))

  return {
    ...run,
    actions,
    averageResponseSeconds: typeof report.summary.averageResponseSeconds === 'number' ? report.summary.averageResponseSeconds : undefined,
    tasks: toRunTasks(report.summary),
  }
}

export function getTraineeProgress(db: OccDatabase, trainee: RunTrainee): TraineeProgress {
  return summarizeProgress(trainee, listRuns(db))
}
