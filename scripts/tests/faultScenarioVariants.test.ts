import assert from 'node:assert/strict'
import { applyCommsRequest, getCommsMessage } from '../../src/comms/commsCatalog'
import { scenarioTemplates } from '../../src/scenarioLibrary'
import { getScenarioTaskBlocker } from '../../src/scenarioWorkflow'
import { createInitialSession } from '../../src/sessionState'
import {
  applyTrainingScenarioRuntimeEvent,
  createTrainingScenarioStartSession,
  findTrainingScenarioDefinition,
  scoreTrainingScenario,
  trainingScenarioDefinitions,
} from '../../src/trainingScenarios'
import type { TrainingScenarioDefinition, TrainingScenarioRuntimeEvent } from '../../src/trainingScenarios'

const faultDefinitions = trainingScenarioDefinitions.filter((definition) => (
  definition.kind === 'DOOR_FAULT' || definition.kind === 'PSD_FAULT'
))

// Three train door SOP variants and six PSD SOP variants.
assert.deepEqual(faultDefinitions.map((definition) => definition.id), [
  'door-fault',
  'door-fault-ehs',
  'door-fault-detrainment',
  'psd-fault-obstructed',
  'psd-fault-fail-open',
  'psd-fault-fail-close',
  'psd-fault-override',
  'psd-fault-manual',
  'psd-fault-multiple',
])
assert.equal(new Set(trainingScenarioDefinitions.flatMap((definition) => definition.tasks.map((task) => `${definition.id}:${task.id}`))).size,
  trainingScenarioDefinitions.reduce((total, definition) => total + definition.tasks.length, 0))

// Every incident offered in Scenario setup arms its own SOP variant.
scenarioTemplates
  .filter((template) => template.trainingScenarioKind === 'DOOR_FAULT' || template.trainingScenarioKind === 'PSD_FAULT')
  .forEach((template) => {
    const ids = template.incidents.map((incident) => findTrainingScenarioDefinition(template.trainingScenarioKind!, incident).id)

    assert.equal(new Set(ids).size, template.incidents.length, template.id)
  })

// Every call a scenario requires exists in the Calls panel catalog.
trainingScenarioDefinitions.forEach((definition) => definition.tasks.forEach((task) => {
  task.commsMessageIds?.forEach((messageId) => assert.ok(getCommsMessage(messageId), `${definition.id} ${messageId}`))
}))

function runFullSop(definition: TrainingScenarioDefinition) {
  const event = (value: Omit<TrainingScenarioRuntimeEvent, 'source'> & { type: TrainingScenarioRuntimeEvent['type'] }) => (
    { source: 'Test', ...value } as TrainingScenarioRuntimeEvent
  )
  let session = createTrainingScenarioStartSession(createInitialSession(), definition.kind, definition.incident)

  assert.equal(session.activeScenario.id, definition.id)
  assert.equal(session.alarmSummaryRows[0].description, definition.fault?.alarm.description)
  assert.equal(session.alarmSummaryRows[0].asset, definition.fault?.alarm.asset)
  assert.equal(session.alarmSummaryRows[0].tone, 'red')
  assert.equal(session.trains.find((train) => train.id === '317')?.status, 'HOLD')
  assert.equal(
    session.trains.find((train) => train.id === '317')?.doorFailureState,
    definition.fault?.trainDoorFault ? 'FAULT_ALARM' : undefined,
  )
  assert.equal(scoreTrainingScenario(session).completedTasks, 0)

  const apply = (next: TrainingScenarioRuntimeEvent) => {
    const result = applyTrainingScenarioRuntimeEvent(session, next)
    assert.equal(result.allowed, true, `${definition.id} ${next.type}: ${result.next.scenarioNotice.text}`)
    session = result.next
  }

  apply(event({ trainId: '317', type: 'TRAIN_SELECTED' }))
  apply(event({ trainId: '317', type: 'ALARM_ACKNOWLEDGED' }))
  definition.tasks.flatMap((task) => task.commsMessageIds ?? []).forEach((messageId) => {
    session = applyCommsRequest(session, { messageId, station: 'HGN', trainId: '317' })
  })
  apply(event({ trainId: '317', type: 'TRAIN_HOLD_APPLIED' }))

  if (definition.tasks.some((task) => task.doorCommandLabels)) {
    apply({ commandLabel: 'Cycle Door', source: 'Test', summaryStatus: 'CYCLE DOOR REQUESTED', trainId: '317', type: 'DOOR_COMMAND_CONFIRMED' })
    apply({ commandLabel: 'Confirm Closed/Locked', source: 'Test', summaryStatus: 'CLOSED/LOCKED', trainId: '317', type: 'DOOR_COMMAND_CONFIRMED' })
  }

  if (definition.tasks.some((task) => task.mappedTaskId === 'setRoute')) {
    apply({ routeLabel: 'Line Map route command', source: 'Test', trainId: '317', type: 'ROUTE_SET' })
  }

  apply(event({ trainId: '317', type: 'DEPARTURE_TIME_CONFIRMED' }))
  apply({ source: 'Test', type: 'SCENARIO_REVIEWED' })

  return { score: scoreTrainingScenario(session), session }
}

faultDefinitions.forEach((definition) => {
  const { score } = runFullSop(definition)
  const open = score.taskResults.filter((task) => !task.complete).map((task) => task.id)

  assert.deepEqual(open, [], `${definition.id} open tasks`)
  assert.equal(score.score, 100, definition.id)
  assert.equal(score.result, 'PASS', definition.id)
})

// Skipping the calls leaves the critical SOP steps open.
{
  const definition = findTrainingScenarioDefinition('PSD_FAULT', 'Single PSD failed to close')
  let session = createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT', 'Single PSD failed to close')

  session = applyTrainingScenarioRuntimeEvent(session, { source: 'Test', trainId: '317', type: 'TRAIN_SELECTED' }).next
  session = applyTrainingScenarioRuntimeEvent(session, { source: 'Test', trainId: '317', type: 'ALARM_ACKNOWLEDGED' }).next

  const score = scoreTrainingScenario(session)

  assert.equal(definition.id, 'psd-fault-fail-close')
  assert.equal(score.taskResults.find((task) => task.id === 'isolate-psd-open')?.complete, false)
  assert.equal(score.taskResults.find((task) => task.id === 'hold-psd-fail-close-train')?.complete, false)
}

// A hold on a different train does not count.
{
  let session = createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT', 'EHS activation')

  session = applyTrainingScenarioRuntimeEvent(session, { source: 'Test', trainId: '320', type: 'TRAIN_HOLD_APPLIED' }).next
  assert.equal(scoreTrainingScenario(session).taskResults.find((task) => task.id === 'hold-ehs-train')?.complete, false)
}

// Fault variants release the held train (IDT) without a new route; the original door fault still needs one.
assert.equal(getScenarioTaskBlocker({ ackAlarm: true, selectTrain: true }, 'dispatchTrain', 'psd-fault-obstructed', '317'), '')
assert.equal(getScenarioTaskBlocker({ ackAlarm: true, selectTrain: true }, 'dispatchTrain', 'door-fault-ehs', '317'), '')
assert.equal(getScenarioTaskBlocker({ ackAlarm: true, selectTrain: true }, 'dispatchTrain', 'door-fault', '317'), 'Apply route command before dispatch.')
assert.equal(getScenarioTaskBlocker({ ackAlarm: true, selectTrain: true }, 'dispatchTrain', 'train-launch', '306'), 'Apply route command before dispatch.')

// Without an incident, a kind still arms its first variant.
assert.equal(createTrainingScenarioStartSession(createInitialSession(), 'PSD_FAULT').activeScenario.id, 'psd-fault-obstructed')
assert.equal(createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT', 'unknown').activeScenario.id, 'door-fault')
