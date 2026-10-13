import assert from 'node:assert/strict'
import { getCommsMessage } from '../../src/comms/commsCatalog'
import { scenarioTemplates } from '../../src/scenarioLibrary'
import { applySessionCommand } from '../../src/session-commands/applySessionCommand'
import type { SessionActor, SessionCommand } from '../../src/session-commands/types'
import { createInitialSession } from '../../src/sessionState'
import {
  applyTrainingScenarioRuntimeEvent,
  findTrainingScenarioDefinition,
  getActiveTrainingScenarioTargetTrainId,
  scoreTrainingScenario,
  trainingScenarioDefinitions,
} from '../../src/trainingScenarios'
import type { TrainingScenarioKind, TrainingScenarioRuntimeEvent } from '../../src/trainingScenarios'
import type { OccSessionState } from '../../src/types'

// The two SOP scenarios added after the four originals: the train loop & shuttle
// service (NEL/OPS/TRA/OP/DEG/14.001.46) and unscheduled train withdrawal
// (NEL/OPS/TRA/OP/OCC/03.001.9).

const trainer: SessionActor = { name: 'Trainer', role: 'trainer' }
const trainee: SessionActor = { id: 'alex.tan@trainee.local', name: 'Alex Tan', role: 'trainee' }
const location = { station: 'SER', track: 'SB' as const, trainId: '345' }

function apply(session: OccSessionState, actor: SessionActor, command: SessionCommand) {
  const result = applySessionCommand(session, command, { actor })

  assert.equal(result.accepted, true, `${command.type}: ${result.reason}`)
  return result.session
}

function load(kind: TrainingScenarioKind, incident: string) {
  const session = createInitialSession()

  return apply(session, trainer, {
    duration: '06:00',
    faultLocation: location,
    incident,
    kind,
    timetableName: session.timetableName,
    trainingMode: 'ASSESSMENT',
    type: 'LOAD_SCENARIO',
  })
}

function event(session: OccSessionState, value: TrainingScenarioRuntimeEvent) {
  const result = applyTrainingScenarioRuntimeEvent(session, value)

  assert.equal(result.allowed, true, `${value.type}: ${result.next.scenarioNotice.text}`)
  return result.next
}

function logCalls(session: OccSessionState, messageIds: readonly string[], station?: string) {
  return messageIds.reduce((current, messageId) => apply(current, trainee, {
    request: { messageId, station, trainId: location.trainId },
    type: 'LOG_CALL',
  }), session)
}

// Both families appear in the console with one definition per incident.
for (const kind of ['SERVICE_DISRUPTION', 'UNSCHEDULED_WITHDRAWAL'] as const) {
  const template = scenarioTemplates.find((item) => item.trainingScenarioKind === kind)

  assert.ok(template, kind)
  assert.equal(template.status, 'Active')

  const ids = template.incidents.map((incident) => findTrainingScenarioDefinition(kind, incident).id)

  assert.equal(new Set(ids).size, template.incidents.length, kind)
  ids.forEach((id) => assert.equal(trainingScenarioDefinitions.find((item) => item.id === id)?.kind, kind))
}

// Every call either scenario requires is in the Calls panel catalog.
trainingScenarioDefinitions
  .filter((definition) => definition.kind === 'SERVICE_DISRUPTION' || definition.kind === 'UNSCHEDULED_WITHDRAWAL')
  .forEach((definition) => definition.tasks.forEach((task) => {
    task.commsMessageIds?.forEach((messageId) => assert.ok(getCommsMessage(messageId), `${definition.id} ${messageId}`))
  }))

// Train loop & shuttle: line-wide, no train placed or held, scored on the calls.
{
  const patterns = scenarioTemplates.find((item) => item.trainingScenarioKind === 'SERVICE_DISRUPTION')!.incidents

  assert.equal(patterns.length, 5)

  for (const incident of patterns) {
    const before = createInitialSession()
    let session = load('SERVICE_DISRUPTION', incident)
    const definition = findTrainingScenarioDefinition('SERVICE_DISRUPTION', incident)

    assert.equal(session.activeScenario.id, definition.id)
    assert.equal(session.activeScenario.targetTrainId, undefined, incident)
    assert.equal(getActiveTrainingScenarioTargetTrainId(session), '')
    assert.equal(session.trains.find((train) => train.id === location.trainId)?.status, before.trains.find((train) => train.id === location.trainId)?.status)
    assert.match(session.scenarioNotice.text, /CC has decided on: loop/)
    assert.equal(session.alarmSummaryRows.some((row) => row.scenarioAlarm), false, 'no fault alarm')

    // Shuttle patterns also need the shuttle PA.
    assert.equal(definition.tasks.some((task) => task.commsMessageIds?.includes('coc-shuttle-pa')), /shuttle/i.test(incident), incident)

    // A train event elsewhere does not count for a line-wide scenario.
    session = event(session, { source: 'Test', trainId: location.trainId, type: 'TRAIN_SELECTED' })
    assert.equal(scoreTrainingScenario(session).completedTasks, 0)

    // Ending before the critical calls does not pass.
    assert.equal(scoreTrainingScenario({ ...session, scenarioMode: 'COMPLETE' }).result, 'NEEDS REVIEW')

    session = logCalls(session, definition.tasks.flatMap((task) => task.commsMessageIds ?? []), 'PTP')
    session = event(session, { source: 'Test', type: 'SCENARIO_REVIEWED' })

    const score = scoreTrainingScenario(session)

    assert.deepEqual(score.taskResults.filter((task) => !task.complete).map((task) => task.id), [], incident)
    assert.equal(score.result, 'PASS', incident)
    assert.equal(score.score, 100, incident)
  }
}

// Unscheduled withdrawal: the train is placed and held at the chosen platform.
{
  const definition = findTrainingScenarioDefinition('UNSCHEDULED_WITHDRAWAL')
  let session = load('UNSCHEDULED_WITHDRAWAL', definition.incident)
  const train = session.trains.find((item) => item.id === location.trainId)

  assert.equal(session.activeScenario.id, 'unscheduled-withdrawal')
  assert.equal(session.activeScenario.targetTrainId, '345')
  assert.deepEqual(session.activeScenario.faultLocation, { station: 'SER', track: 'SB' })
  assert.equal(session.activeScenario.target, 'Train 345 at SER SB')
  assert.equal(train?.status, 'HOLD')
  assert.equal(train?.doorFailureState, undefined, 'no door fault')
  assert.equal(session.scenarioNotice.text, 'Unscheduled withdrawal: CC has decided to withdraw Train 345 at SER SB. Respond as per SOP.')
  assert.equal(session.alarmSummaryRows.some((row) => row.scenarioAlarm), false, 'no fault alarm')

  session = event(session, { source: 'Test', trainId: '345', type: 'TRAIN_SELECTED' })
  assert.equal(session.scenarioNotice.text, 'Train 345 selected for withdrawal.')

  // Everything but the calls: the driver, station, CoC and Train Clear steps stay open.
  session = apply(session, trainer, { label: 'Close all train doors & PSDs for train clear', taskId: 'close-doors-unscheduled-withdrawal', type: 'CONFIRM_TASK' })
  session = event(session, { routeLabel: 'Line Map route command', source: 'Test', trainId: '345', type: 'ROUTE_SET' })
  session = event(session, { source: 'Test', trainId: '345', type: 'DEPARTURE_TIME_CONFIRMED' })

  const missingCalls = scoreTrainingScenario({ ...session, scenarioMode: 'COMPLETE' })

  assert.equal(missingCalls.result, 'NEEDS REVIEW')
  assert.deepEqual(missingCalls.taskResults.filter((task) => !task.complete && task.critical).map((task) => task.id), [
    'driver-unscheduled-withdrawal',
    'station-unscheduled-withdrawal',
    'coc-unscheduled-withdrawal',
    'train-clear-unscheduled-withdrawal',
  ])

  session = logCalls(session, definition.tasks.flatMap((task) => task.commsMessageIds ?? []), 'SER')
  session = event(session, { source: 'Test', type: 'SCENARIO_REVIEWED' })

  const score = scoreTrainingScenario(session)

  assert.deepEqual(score.taskResults.filter((task) => !task.complete).map((task) => task.id), [])
  assert.equal(score.result, 'PASS')
  assert.equal(score.score, 100)
}
