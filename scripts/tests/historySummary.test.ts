import assert from 'node:assert/strict'
import { describeAction, describeActionSubject, summarizeProgress, toRunSummary } from '../../src/history'
import type { RunSummary } from '../../src/history'

// Reports from every era read back as runs.
{
  const legacy = toRunSummary({ id: 'legacy-report', notes: '', summary: { score: 80 } })

  assert.equal(legacy.scenarioTitle, 'Unknown scenario')
  assert.equal(legacy.score, 80)
  assert.equal(legacy.completed, false)
  assert.deepEqual(legacy.trainees, [])

  const current = toRunSummary({
    id: 'K7M2-x#2026-10-13T01:00:00.000Z',
    notes: 'Good call order.',
    summary: {
      exercise: 2,
      lifecycle: 'COMPLETE',
      result: 'PASS',
      scenarioTitle: 'PSD Obstructed',
      score: 95,
      startedAt: '2026-10-13T01:00:00.000Z',
      trainees: [{ id: 'alex.tan', name: 'Alex Tan' }, { bad: true }],
    },
  })

  assert.equal(current.completed, true)
  assert.equal(current.exercise, 2)
  assert.equal(current.notes, 'Good call order.')
  assert.deepEqual(current.trainees, [{ id: 'alex.tan', name: 'Alex Tan' }])
}

// Progress counts completed runs; the latest result per scenario is the newest run.
{
  const run = (overrides: Partial<RunSummary>): RunSummary => ({
    completed: true,
    id: Math.random().toString(16),
    notes: '',
    rejectedActions: 0,
    result: 'PASS',
    scenarioTitle: 'PSD Obstructed',
    score: 100,
    trainees: [{ id: 'alex.tan', name: 'Alex Tan' }],
    ...overrides,
  })
  const progress = summarizeProgress({ id: 'alex.tan', name: 'Alex Tan' }, [
    run({ result: 'NEEDS REVIEW', score: 60, startedAt: '2026-10-10T01:00:00.000Z' }),
    run({ score: 90, startedAt: '2026-10-12T01:00:00.000Z' }),
    run({ scenarioTitle: 'Train Launch', score: 80, startedAt: '2026-10-11T01:00:00.000Z' }),
    run({ completed: false, result: 'IN PROGRESS', score: 20, startedAt: '2026-10-13T01:00:00.000Z' }),
    run({ startedAt: '2026-10-13T02:00:00.000Z', trainees: [{ id: 'bea.ong', name: 'Bea Ong' }] }),
  ])

  assert.deepEqual(progress.totals, { averageScore: 77, completed: 3, passed: 2, runs: 4 })
  assert.equal(progress.runs[0].result, 'IN PROGRESS', 'newest first, including runs not completed')

  const psd = progress.byScenario.find((scenario) => scenario.scenarioTitle === 'PSD Obstructed')

  assert.deepEqual(
    [psd?.runs, psd?.passes, psd?.bestScore, psd?.averageScore, psd?.lastResult],
    [2, 1, 90, 75, 'PASS'],
  )
  assert.deepEqual(progress.byScenario.map((scenario) => scenario.scenarioTitle), ['PSD Obstructed', 'Train Launch'])
}

assert.equal(describeAction('ACK_ALARMS'), 'Acknowledged alarms')
assert.equal(describeAction('SOMETHING_NEW'), 'SOMETHING_NEW')

// A logged command's subject: which train, call or state it was about.
assert.equal(describeActionSubject({ trainId: '345', type: 'TRAIN_HOLD' }), 'Train 345')
assert.equal(describeActionSubject({ command: 'DISPATCH', trainId: '345', type: 'SCADA_TRAIN_COMMAND' }), 'Train 345 · DISPATCH')
assert.equal(describeActionSubject({ request: { messageId: 'no-such-call' }, type: 'LOG_CALL' }), 'no-such-call')
assert.equal(describeActionSubject({ state: 'COMPLETE', type: 'SET_SCENARIO_STATE' }), 'complete')
assert.equal(describeActionSubject({ type: 'RESET_SCENARIO' }), undefined)
