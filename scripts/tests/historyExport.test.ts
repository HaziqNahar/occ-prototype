import assert from 'node:assert/strict'
import { summarizeProgress } from '../../src/history'
import type { RunDetail, RunSummary } from '../../src/history'
import { exportFileName, formatExportTime, progressToCsv, runsToCsv, runToCsv, toCsv } from '../../src/historyExport'

// Cells with commas, quotes or line breaks are quoted; spreadsheet formulas are defused.
assert.equal(toCsv([['a', 'b,c', 'say "hi"', 'two\nlines', 3, null, undefined, true]]), 'a,"b,c","say ""hi""","two\nlines",3,,,true\r\n')
assert.equal(toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)', 'plain']]), `"'=HYPERLINK(""x"")",'+1,'-2,'@SUM(A1),plain\r\n`)
assert.equal(toCsv([[-2]]), '-2\r\n', 'real numbers stay numbers')

assert.equal(formatExportTime(undefined), '')
assert.equal(formatExportTime('not a date'), '')
assert.match(formatExportTime('2026-10-13T00:59:47.000Z'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
assert.match(formatExportTime('2026-10-13T00:59:47.000Z', true), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:47$/)
assert.equal(exportFileName('occ-run', 'alex.tan', '2026-10-13', 'PSD Obstructed / Exercise 2'), 'occ-run-alex.tan-2026-10-13-PSD-Obstructed-Exercise-2.csv')
assert.equal(exportFileName('occ-runs', undefined, ''), 'occ-runs.csv')

const run: RunSummary = {
  completed: true,
  completedAt: '2026-10-13T01:05:00.000Z',
  durationLabel: '5m 00s',
  exercise: 2,
  id: 'K7M2-x#2026-10-13T01:00:00.000Z',
  mode: 'ASSESSMENT',
  notes: 'Calls in order, hold "prompt".',
  rejectedActions: 1,
  result: 'PASS',
  scenarioTitle: 'PSD Obstructed',
  score: 95,
  sessionCode: 'K7M2',
  startedAt: '2026-10-13T01:00:00.000Z',
  trainees: [{ id: 'alex.tan', name: 'Alex Tan' }],
}

// The run list: one header row and one row per run.
{
  const lines = runsToCsv([run, { ...run, completed: false, id: 'r2', notes: '', result: 'IN PROGRESS', score: 20 }]).trimEnd().split('\r\n')

  assert.equal(lines.length, 3)
  assert.equal(lines[0], 'Date,Trainee,Scenario,Exercise,Session code,Mode,Result,Score %,Time,Wrong actions,Completed,Trainer notes,Run id')
  assert.match(lines[1], /,Alex Tan,PSD Obstructed,2,K7M2,assessment,PASS,95,5m 00s,1,yes,"Calls in order, hold ""prompt""\.",/)
  assert.match(lines[2], /,NOT COMPLETED,20,.*,no,,r2$/)
}

// One run: summary, checklist and actions with plain action names.
{
  const detail: RunDetail = {
    ...run,
    actions: [
      { accepted: true, actionType: 'TRAIN_HOLD', actor: 'Alex Tan', actorRole: 'trainee', at: '2026-10-13T01:01:00.000Z', detail: null, subject: 'Train 345' },
      { accepted: false, actionType: 'TRAIN_DOOR_COMMAND', actor: 'Alex Tan', actorRole: 'trainee', at: '2026-10-13T01:02:00.000Z', detail: 'Hold the train first.', subject: 'Train 345' },
    ],
    tasks: [
      { complete: true, critical: true, label: 'Apply platform hold on the train', monitor: 'Line Map' },
      { complete: false, label: 'Review final incident state', monitor: 'IOS' },
    ],
  }
  const csv = runToCsv(detail)

  assert.match(csv, /^Run,PSD Obstructed\r\n/)
  assert.match(csv, /\r\nChecklist,Done,Critical,Where\r\nApply platform hold on the train,yes,yes,Line Map\r\nReview final incident state,no,,IOS\r\n/)
  assert.match(csv, /,Alex Tan,trainee,Held a train,Train 345,Done\r\n/)
  assert.match(csv, /,Door command,Train 345,Refused: Hold the train first\.\r\n$/)
}

// A trainee's progress: totals, per scenario, then each run.
{
  const csv = progressToCsv(summarizeProgress({ id: 'alex.tan', name: 'Alex Tan' }, [run]))

  assert.match(csv, /^Trainee,Alex Tan\r\nUsername,alex.tan\r\nRuns on record,1\r\nCompleted,1\r\nPassed,1\r\nAverage score %,95\r\n/)
  assert.match(csv, /\r\nPSD Obstructed,1,1,95,95,PASS,/)
}
