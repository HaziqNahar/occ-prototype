import assert from 'node:assert/strict'
import { applyCommsRequest, getCommsMessage } from '../../src/comms/commsCatalog'
import { scenarioTemplates } from '../../src/scenarioLibrary'
import { platformData } from '../../src/screens/line-map/model'
import { getScenarioTaskBlocker } from '../../src/scenarioWorkflow'
import { createInitialSession } from '../../src/sessionState'
import {
  DEFAULT_FAULT_LOCATION,
  applyTrainingScenarioRuntimeEvent,
  createTrainingScenarioStartSession,
  pickRandomFaultLocation,
  resolveFaultText,
  findTrainingScenarioDefinition,
  scoreTrainingScenario,
  trainingScenarioDefinitions,
} from '../../src/trainingScenarios'
import type { FaultLocation, TrainingScenarioDefinition, TrainingScenarioRuntimeEvent } from '../../src/trainingScenarios'

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

function runFullSop(definition: TrainingScenarioDefinition, location: FaultLocation = DEFAULT_FAULT_LOCATION) {
  const event = (value: Omit<TrainingScenarioRuntimeEvent, 'source'> & { type: TrainingScenarioRuntimeEvent['type'] }) => (
    { source: 'Test', ...value } as TrainingScenarioRuntimeEvent
  )
  let session = createTrainingScenarioStartSession(createInitialSession(), definition.kind, definition.incident, { faultLocation: location })
  const trainId = location.trainId

  assert.equal(session.activeScenario.id, definition.id)
  assert.equal(session.alarmSummaryRows[0].description, resolveFaultText(definition.fault?.alarm.description ?? '', location))
  assert.equal(session.alarmSummaryRows[0].asset, resolveFaultText(definition.fault?.alarm.asset ?? '', location))
  assert.equal(session.alarmSummaryRows[0].tone, 'red')
  assert.equal(session.trains.find((train) => train.id === trainId)?.status, 'HOLD')
  assert.equal(
    session.trains.find((train) => train.id === trainId)?.doorFailureState,
    definition.fault?.trainDoorFault ? 'FAULT_ALARM' : undefined,
  )
  assert.equal(scoreTrainingScenario(session).completedTasks, 0)

  const apply = (next: TrainingScenarioRuntimeEvent) => {
    const result = applyTrainingScenarioRuntimeEvent(session, next)
    assert.equal(result.allowed, true, `${definition.id} ${next.type}: ${result.next.scenarioNotice.text}`)
    session = result.next
  }

  apply(event({ trainId, type: 'TRAIN_SELECTED' }))
  apply(event({ trainId, type: 'ALARM_ACKNOWLEDGED' }))
  definition.tasks.flatMap((task) => task.commsMessageIds ?? []).forEach((messageId) => {
    session = applyCommsRequest(session, { messageId, station: location.station, trainId })
  })
  apply(event({ trainId, type: 'TRAIN_HOLD_APPLIED' }))

  if (definition.tasks.some((task) => task.doorCommandLabels)) {
    apply({ commandLabel: 'Cycle Door', source: 'Test', summaryStatus: 'CYCLE DOOR REQUESTED', trainId, type: 'DOOR_COMMAND_CONFIRMED' })
    apply({ commandLabel: 'Confirm Closed/Locked', source: 'Test', summaryStatus: 'CLOSED/LOCKED', trainId, type: 'DOOR_COMMAND_CONFIRMED' })
  }

  if (definition.tasks.some((task) => task.mappedTaskId === 'setRoute')) {
    apply({ routeLabel: 'Line Map route command', source: 'Test', trainId, type: 'ROUTE_SET' })
  }

  apply(event({ trainId, type: 'DEPARTURE_TIME_CONFIRMED' }))
  apply({ source: 'Test', type: 'SCENARIO_REVIEWED' })

  return { score: scoreTrainingScenario(session), session }
}

faultDefinitions.forEach((definition) => {
  const { score } = runFullSop(definition)
  // The same SOP also passes on another train, station and bound.
  const elsewhere = runFullSop(definition, { station: 'SER', track: 'SB', trainId: '345' })

  assert.equal(elsewhere.score.result, 'PASS', `${definition.id} elsewhere`)
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

// A fault location puts the incident on that train, station and bound.
{
  const location: FaultLocation = { station: 'SER', track: 'SB', trainId: '345' }
  const before = createInitialSession()
  const session = createTrainingScenarioStartSession(before, 'PSD_FAULT', 'PSD obstructed', { faultLocation: location })
  const train = session.trains.find((item) => item.id === '345')

  assert.equal(session.activeScenario.targetTrainId, '345')
  assert.deepEqual(session.activeScenario.faultLocation, { station: 'SER', track: 'SB' })
  assert.equal(session.activeScenario.target, 'SER SB platform, PSD 07')
  assert.equal(session.alarmSummaryRows[0].description, 'PSD: SER SB Door 07 Obstructed')
  assert.equal(session.alarmSummaryRows[0].asset, 'SIG/SER/B2/PSD0507')
  assert.match(session.scenarioNotice.text, /PSD: SER SB Door 07 Obstructed/)
  // The train is held at the SER southbound platform and shown on the line map.
  assert.equal(train?.status, 'HOLD')
  assert.equal(train?.lineMapVisible, true)
  assert.equal(train?.timetablePlayback, false)
  assert.equal(train?.direction, 'left')
  assert.equal(train?.service, 'SB')
  assert.equal(train?.x, (platformData.find((platform) => platform.code === 'SER')?.x ?? 0) + 4)
  assert.equal(train?.y, 512)
  // Finding the train is part of the exercise, so it is not pre-selected.
  assert.equal(session.selectedTrainId, before.selectedTrainId)
  // Events on another train do not count.
  const wrongTrain = applyTrainingScenarioRuntimeEvent(session, { source: 'Test', trainId: '317', type: 'TRAIN_HOLD_APPLIED' }).next
  assert.equal(scoreTrainingScenario(wrongTrain).taskResults.find((task) => task.id === 'hold-psd-obstructed-train')?.complete, false)
}

// Door fault text names the chosen train.
{
  const session = createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT', 'Door fault', {
    faultLocation: { station: 'PTP', track: 'NB', trainId: '330' },
  })

  assert.equal(session.alarmSummaryRows[0].description, 'Train 330 Car 3: Saloon Door Failure in Open/Close')
  assert.equal(session.trains.find((train) => train.id === '330')?.doorFailureState, 'FAULT_ALARM')
  assert.equal(session.trains.find((train) => train.id === '317')?.doorFailureState, undefined)
}

// Random locations use real stations, both bounds and trains from the roster.
{
  const session = createInitialSession()
  const values = [0, 0.99, 0.5, 0.2, 0.7, 0.4]
  let call = 0
  const sequence = () => values[call++ % values.length]
  const picks = Array.from({ length: 6 }, () => pickRandomFaultLocation(session, sequence))
  const trainIds = new Set(session.trains.map((train) => train.id))

  picks.forEach((pick) => {
    assert.equal(trainIds.has(pick.trainId), true)
    assert.match(pick.station, /^[A-Z]{3}$/)
    assert.ok(pick.track === 'NB' || pick.track === 'SB')
  })
  assert.equal(new Set(picks.map((pick) => pick.track)).size, 2)
  assert.ok(new Set(picks.map((pick) => pick.station)).size > 1)
  // Trains already running on the map are avoided.
  const busy = { ...session, trains: session.trains.map((train) => ({ ...train, lineMapVisible: train.id !== '350' })) }
  assert.equal(pickRandomFaultLocation(busy, () => 0.3).trainId, '350')
  // With no location given, scenarios fall back to Train 317 at BGK northbound.
  assert.equal(resolveFaultText('{train} {station} {bound}', DEFAULT_FAULT_LOCATION), '317 BGK NB')
  assert.equal(resolveFaultText('PSD at {station} {bound} on {train}'), 'PSD at the station on the train')
}
