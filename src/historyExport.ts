import { describeAction } from './history'
import type { RunDetail, RunSummary, TraineeProgress } from './history'

// CSV exports of past runs and trainee progress, for training records and
// spreadsheets. Built from what the server already let this person see.

type Cell = string | number | boolean | null | undefined

// Excel would run a cell starting with = + - @ (or tab / CR) as a formula.
const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(value: Cell) {
  if (value === null || value === undefined) {
    return ''
  }

  let text = String(value)

  if (typeof value === 'string' && FORMULA_START.test(text)) {
    text = `'${text}`
  }

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: readonly (readonly Cell[])[]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

// Local date and time, sortable: 2026-10-13 08:59 (or 08:59:47).
export function formatExportTime(value: string | undefined, withSeconds = false) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (part: number) => String(part).padStart(2, '0')

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}${withSeconds ? `:${pad(date.getSeconds())}` : ''}`

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
}

const resultLabel = (result: string) => (result === 'IN PROGRESS' ? 'NOT COMPLETED' : result)
const trainees = (run: RunSummary) => run.trainees.map((trainee) => trainee.name).join('; ')

export function runsToCsv(runs: readonly RunSummary[]) {
  return toCsv([
    ['Date', 'Trainee', 'Scenario', 'Exercise', 'Session code', 'Mode', 'Result', 'Score %', 'Time', 'Wrong actions', 'Completed', 'Trainer notes', 'Run id'],
    ...runs.map((run) => [
      formatExportTime(run.startedAt ?? run.completedAt),
      trainees(run),
      run.scenarioTitle,
      run.exercise,
      run.sessionCode,
      run.mode?.toLowerCase(),
      resultLabel(run.result),
      run.score,
      run.durationLabel,
      run.rejectedActions,
      run.completed ? 'yes' : 'no',
      run.notes,
      run.id,
    ]),
  ])
}

// One run: its summary, checklist and every action, in one sheet.
export function runToCsv(run: RunDetail) {
  return toCsv([
    ['Run', run.scenarioTitle],
    ['Date', formatExportTime(run.startedAt ?? run.completedAt)],
    ['Trainee', trainees(run)],
    ['Exercise', run.exercise],
    ['Session code', run.sessionCode],
    ['Mode', run.mode?.toLowerCase()],
    ['Result', resultLabel(run.result)],
    ['Score %', run.score],
    ['Time', run.durationLabel],
    ['Wrong actions', run.rejectedActions],
    ['Trainer notes', run.notes],
    [],
    ['Checklist', 'Done', 'Critical', 'Where'],
    ...run.tasks.map((task) => [task.label, task.complete ? 'yes' : 'no', task.critical ? 'yes' : '', task.monitor]),
    [],
    ['Time', 'Who', 'Role', 'Action', 'Detail', 'Result'],
    ...run.actions.map((action) => [
      formatExportTime(action.at, true),
      action.actor,
      action.actorRole,
      describeAction(action.actionType),
      action.subject,
      action.accepted === false ? `Refused${action.detail ? `: ${action.detail}` : ''}` : 'Done',
    ]),
  ])
}

export function progressToCsv(progress: TraineeProgress) {
  const { totals } = progress

  return toCsv([
    ['Trainee', progress.trainee.name],
    ['Username', progress.trainee.id],
    ['Runs on record', totals.runs],
    ['Completed', totals.completed],
    ['Passed', totals.passed],
    ['Average score %', totals.completed ? totals.averageScore : ''],
    [],
    ['Scenario', 'Runs', 'Passed', 'Best %', 'Average %', 'Latest result', 'Latest date'],
    ...progress.byScenario.map((scenario) => [
      scenario.scenarioTitle,
      scenario.runs,
      scenario.passes,
      scenario.bestScore,
      scenario.averageScore,
      resultLabel(scenario.lastResult),
      formatExportTime(scenario.lastRunAt),
    ]),
    [],
    ['Run date', 'Scenario', 'Result', 'Score %', 'Time', 'Wrong actions'],
    ...progress.runs.map((run) => [
      formatExportTime(run.startedAt ?? run.completedAt),
      run.scenarioTitle,
      resultLabel(run.result),
      run.score,
      run.durationLabel,
      run.rejectedActions,
    ]),
  ])
}

// A file name safe on Windows: occ-runs-alex.tan-2026-10-13.csv
export function exportFileName(...parts: Array<string | undefined>) {
  return `${parts
    .filter(Boolean)
    .map((part) => part!.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-')}.csv`
}
