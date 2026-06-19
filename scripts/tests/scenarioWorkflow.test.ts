import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import {
  applyScenarioStep,
  completeScenarioTask,
  getScenarioStepBlocker,
  updateScenarioTask,
  upsertTimetableRow,
} from '../../src/scenarioWorkflow'
import type { LineMapRouteSegmentStatus, LineMapRuntimeState, TrainState } from '../../src/types'

function updateLineMapRouteState(
  lineMap: Partial<LineMapRuntimeState> | undefined,
  train: Pick<TrainState, 'id'>,
  status: LineMapRouteSegmentStatus,
): LineMapRuntimeState {
  return {
    layoutVersion: lineMap?.layoutVersion ?? 1,
    routeSegments: {
      ...(lineMap?.routeSegments ?? {}),
      [`scenario-${train.id}`]: {
        segmentId: `scenario-${train.id}`,
        status,
        trainId: train.id,
        updatedAt: 1,
      },
    },
  }
}

{
  const rows = upsertTimetableRow([], '317', 'H>')

  assert.equal(rows.length, 1)
  assert.equal(rows[0].train, '317')
  assert.equal(rows[0].state, 'H>')
  assert.equal(upsertTimetableRow(rows, '317', 'R')[0].state, 'R')
}

{
  const tasks = updateScenarioTask(undefined, 'selectTrain')

  assert.equal(tasks.selectTrain, true)
  assert.equal(tasks.ackAlarm, false)
}

{
  const initial = createInitialSession()
  const stepOne = applyScenarioStep(initial, 1, { updateLineMapRouteState })
  const train317 = stepOne.trains.find((train) => train.id === '317')

  assert.equal(stepOne.scenarioMode, 'RUNNING')
  assert.equal(stepOne.scenarioStep, 1)
  assert.equal(stepOne.scenarioTasks.selectTrain, true)
  assert.equal(train317?.status, 'HOLD')
}

{
  const initial = createInitialSession()
  const stepThree = applyScenarioStep(initial, 3, { updateLineMapRouteState })

  assert.equal(stepThree.scenarioTasks.setRoute, true)
  assert.equal(stepThree.lineMap.routeSegments['scenario-317'].status, 'SET')
}

{
  const initial = createInitialSession()

  assert.equal(getScenarioStepBlocker(initial, 3), 'Select Train 317 before applying route.')

  const selectedAndAcked = {
    ...initial,
    scenarioTasks: {
      ...initial.scenarioTasks,
      ackAlarm: true,
      selectTrain: true,
    },
  }

  assert.equal(getScenarioStepBlocker(selectedAndAcked, 3), '')
}

{
  const initial = createInitialSession()
  const result = completeScenarioTask(initial, 'dispatchTrain', 'Dispatch accepted.')

  assert.equal(result.allowed, false)
  assert.equal(result.next.scenarioNotice.tone, 'warning')
}
