import assert from 'node:assert/strict'
import { applySessionCommand } from '../../src/session-commands/applySessionCommand'
import { applySessionDelta, createSessionDelta } from '../../src/session-commands/sessionDelta'
import { applySimPatch, createSimPatch } from '../../src/session-commands/simPatch'
import { getAlarmRowKey } from '../../src/session-commands/types'
import type { SessionActor, SessionCommand } from '../../src/session-commands/types'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import { createInitialSession } from '../../src/sessionState'
import { findTrainingScenarioDefinition, scoreTrainingScenario } from '../../src/trainingScenarios'
import type { OccSessionState } from '../../src/types'

const trainer: SessionActor = { name: 'Trainer', role: 'trainer' }
const trainee: SessionActor = { id: 'alex.tan@trainee.local', name: 'Alex Tan', role: 'trainee' }
const location = { station: 'SER', track: 'SB' as const, trainId: '345' }

function run(session: OccSessionState, actor: SessionActor, command: SessionCommand) {
  return applySessionCommand(session, command, { actor })
}

function apply(session: OccSessionState, actor: SessionActor, command: SessionCommand) {
  const result = run(session, actor, command)

  assert.equal(result.accepted, true, `${command.type}: ${result.reason}`)
  return result.session
}

// Only a trainer loads, completes or resets an exercise.
{
  const session = createInitialSession()
  const load: SessionCommand = {
    duration: '06:00',
    faultLocation: location,
    incident: 'PSD obstructed',
    kind: 'PSD_FAULT',
    timetableName: session.timetableName,
    trainingMode: 'ASSESSMENT',
    type: 'LOAD_SCENARIO',
  }
  const refused = run(session, trainee, load)

  assert.equal(refused.accepted, false)
  assert.equal(refused.session, session, 'a refused command changes nothing')
  assert.equal(run(session, trainee, { type: 'RESET_SCENARIO' }).accepted, false)
  assert.equal(run(session, trainee, { state: 'COMPLETE', type: 'SET_SCENARIO_STATE' }).accepted, false)

  // Malformed requests and unknown trains are refused before anything runs.
  assert.equal(run(session, trainee, { type: 'NOT_A_COMMAND' } as unknown as SessionCommand).accepted, false)
  assert.equal(run(session, trainee, { detail: 'x', trainId: '999', type: 'TRAIN_HOLD' }).reason, 'Unknown train 999.')
  assert.equal(run(session, trainer, { ...load, duration: '6 min' }).accepted, false)
}

// A full PSD SOP run, every step a command: scored on the definition, timed,
// and each evidence row records who did it.
{
  const definition = findTrainingScenarioDefinition('PSD_FAULT', 'PSD obstructed')
  let session = apply(createInitialSession(), trainer, {
    duration: '06:00',
    faultLocation: location,
    incident: definition.incident,
    kind: 'PSD_FAULT',
    timetableName: createInitialSession().timetableName,
    trainingMode: 'ASSESSMENT',
    type: 'LOAD_SCENARIO',
  })

  assert.equal(session.activeScenario.id, 'psd-fault-obstructed')
  assert.equal(session.activeScenario.targetTrainId, '345')
  assert.equal(session.activeScenario.duration, '06:00')

  session = apply(session, trainee, { code: session.sessionMeta.code.toLowerCase(), name: ' Alex Tan ', type: 'TRAINEE_JOIN' })
  assert.deepEqual(session.trainees.map((item) => item.email), ['alex.tan@trainee.local'])
  assert.equal(run(session, trainee, { code: 'ZZZZ', name: 'Sam', type: 'TRAINEE_JOIN' }).accepted, false, 'wrong code')

  const incidentAlarm = session.alarmSummaryRows.find((row) => row.scenarioAlarm)
  const otherAlarm = session.alarmSummaryRows.find((row) => !row.scenarioAlarm)

  assert.ok(incidentAlarm && otherAlarm)

  // Acknowledging another alarm is allowed but earns nothing.
  session = apply(session, trainee, { rowKeys: [getAlarmRowKey(otherAlarm)], type: 'ACK_ALARMS' })
  assert.equal(session.scenarioTasks.ackAlarm, false)

  session = apply(session, trainee, { trainId: '345', type: 'SELECT_TRAIN', view: 'menu' })
  session = apply(session, trainee, { rowKeys: [getAlarmRowKey(incidentAlarm)], type: 'ACK_ALARMS' })
  assert.equal(session.scenarioTasks.ackAlarm, true)
  assert.equal(session.assessmentMetrics.tasks.ackAlarm.status, 'ON_TIME', 'acknowledged within its time threshold')

  session = apply(session, trainee, { detail: 'Platform hold applied', trainId: '345', type: 'TRAIN_HOLD' })
  definition.tasks.flatMap((task) => task.commsMessageIds ?? []).forEach((messageId) => {
    session = apply(session, trainee, { request: { messageId, station: location.station, trainId: '345' }, type: 'LOG_CALL' })
  })
  session = apply(session, trainee, { command: 'DISPATCH', trainId: '345', type: 'SCADA_TRAIN_COMMAND' })

  assert.equal(scoreTrainingScenario(session).result, 'IN PROGRESS')
  assert.equal(session.assessmentMetrics.result, 'INCOMPLETE')

  session = apply(session, trainer, { state: 'COMPLETE', type: 'SET_SCENARIO_STATE' })

  const score = scoreTrainingScenario(session)

  assert.equal(score.result, 'PASS')
  assert.equal(session.assessmentMetrics.score, score.score, 'the stored score is the definition-based score')
  assert.equal(session.assessmentMetrics.result, 'PASS')
  assert.ok(session.assessmentMetrics.completedAt)

  const holdEvidence = session.evidenceLog.find((evidence) => evidence.action === 'Train Hold')

  assert.equal(holdEvidence?.actor, 'Alex Tan')
  assert.ok(session.evidenceLog.filter((evidence) => evidence.source === 'IOS Scenario Runtime').every((evidence) => evidence.actor === 'Trainer'))
}

// The train simulation can move trains, routes and timetable states, never
// door faults, ITAMA, tasks or evidence.
{
  const session = createInitialSession()
  const moved: OccSessionState = {
    ...session,
    evidenceLog: [],
    lineMap: {
      ...session.lineMap,
      platformDoorStates: { 'SKG-NB': { platformCode: 'SKG', status: 'CYCLING', track: 'NB', trainId: '306', updatedAt: 1 } },
      routeSegments: { 'rail-617': { segmentId: 'rail-617', status: 'DISPATCHED', trainId: '306', updatedAt: 1 } },
    },
    scenarioTasks: { ...session.scenarioTasks, ackAlarm: true },
    timetableRows: session.timetableRows.map((row, index) => (index === 3 ? { ...row, state: 'H>' } : row)),
    trains: session.trains.map((train) => (
      train.id === '306' ? { ...train, doorFailureState: 'FAULT_ALARM', isMoving: true, itamaGranted: false, x: 1234, y: 56 } : train
    )),
  }
  const patch = createSimPatch(session, moved)

  assert.ok(patch)
  assert.deepEqual(patch.trains, [{ id: '306', isMoving: true, x: 1234, y: 56 }])
  assert.deepEqual(patch.timetableRows, [{ index: 3, state: 'H>', train: session.timetableRows[3].train }])

  // Even a hand-made patch cannot carry scored fields.
  const forged = { ...patch, trains: [{ doorFailureState: 'DOOR_ISOLATED', id: '306', itamaGranted: false, x: 99 }] } as unknown as typeof patch
  const result = apply(session, trainee, { patch: forged, type: 'SIM_UPDATE' })
  const train = result.trains.find((item) => item.id === '306')

  assert.equal(train?.x, 99)
  assert.equal(train?.doorFailureState, undefined)
  assert.equal(train?.itamaGranted, true)
  assert.equal(result.scenarioTasks.ackAlarm, false)
  assert.equal(result.evidenceLog.length, session.evidenceLog.length)
  assert.equal(result.lineMap.platformDoorStates['SKG-NB']?.status, 'CYCLING')
  assert.equal(result.lineMap.routeSegments['rail-617']?.status, 'DISPATCHED')

  // A cleared occupancy travels as a removal.
  const cleared = applySimPatch(
    { ...session, trains: session.trains.map((item) => (item.id === '306' ? { ...item, occupancySegmentId: 'rail-617' } : item)) },
    createSimPatch(
      { ...session, trains: session.trains.map((item) => (item.id === '306' ? { ...item, occupancySegmentId: 'rail-617' } : item)) },
      session,
    ) ?? {},
  )

  assert.equal(cleared.trains.find((item) => item.id === '306')?.occupancySegmentId, undefined)
}

// Launch progress from the timetable only counts when the train is on that step.
{
  let session = apply(createInitialSession(), trainer, {
    duration: '08:00',
    incident: 'Train launch',
    kind: 'TRAIN_LAUNCH',
    timetableName: createInitialSession().timetableName,
    trainingMode: 'PRACTICE',
    type: 'LOAD_SCENARIO',
  })

  session = apply(session, trainer, { trainId: '306', type: 'ASSIGN_LAUNCH_TRAIN' })

  const plan = {
    routeLabel: 'Route R655_617',
    stationRouteId: 'timetable-skg-to-pgl-upper-mainline',
    steps: [{ point: { x: 1, y: 1 }, segmentId: 'rail-999' }, { point: { x: 2, y: 1 }, segmentId: 'rail-998' }],
    trainId: '306',
    to: 'PGL',
  } as unknown as TimetablePlaybackPlan
  const event = { plan, stepIndex: 0, type: 'TIMETABLE_STEP' as const }
  const elsewhere = apply(session, trainee, { events: [event], patch: {}, type: 'SIM_UPDATE' })

  assert.equal(elsewhere.scenarioTasks.setRoute, false, 'the train is not on rail-999, so nothing is scored')

  const onStep = apply(session, trainee, {
    events: [event],
    patch: { trains: [{ id: '306', occupancySegmentId: 'rail-999', x: 1, y: 1 }] },
    type: 'SIM_UPDATE',
  })

  assert.equal(onStep.scenarioTasks.setRoute, true, 'on the step, the launch route is scored')
  assert.equal(onStep.scenarioTasks.dispatchTrain, true)
}

// Deltas rebuild exactly the server's session in every window.
{
  const before = createInitialSession()
  const after = apply(before, trainee, { command: 'HOLD', trainId: '317', type: 'SCADA_TRAIN_COMMAND' })
  const delta = createSessionDelta(before, after)

  assert.ok(delta)
  assert.equal(delta.timetableRows?.mode, 'rows', 'only the changed timetable row is sent')
  assert.deepEqual(applySessionDelta(before, delta), after)
  assert.equal(createSessionDelta(after, after), undefined)
}
