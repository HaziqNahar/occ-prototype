import assert from 'node:assert/strict'
import { applySessionCommand } from '../../src/session-commands/applySessionCommand'
import type { SessionActor, SessionCommand } from '../../src/session-commands/types'
import { createInitialSession, restoreSession } from '../../src/sessionState'
import { trainingScenarioDefinitions } from '../../src/training-scenarios/definitions'
import { getCoachState, getStepHint } from '../../src/training-scenarios/hints'
import { areTrainingAidsOn } from '../../src/trainingAids'
import type { OccSessionState, TrainingMode } from '../../src/types'

const trainer: SessionActor = { name: 'Trainer', role: 'trainer' }
const trainee: SessionActor = { id: 'alex.tan@trainee.local', name: 'Alex Tan', role: 'trainee' }
const location = { station: 'PGL', track: 'SB' as const, trainId: '345' }

function apply(session: OccSessionState, actor: SessionActor, command: SessionCommand) {
  const result = applySessionCommand(session, command, { actor })

  assert.equal(result.accepted, true, `${command.type}: ${result.reason}`)
  return result.session
}

function loadDoorFault(trainingMode: TrainingMode) {
  const session = createInitialSession()

  return apply(session, trainer, {
    duration: '06:00',
    faultLocation: location,
    incident: 'Door fault',
    kind: 'DOOR_FAULT',
    timetableName: session.timetableName,
    trainingMode,
    type: 'LOAD_SCENARIO',
  })
}

// Aids are on for Practice runs; the trainer's switch turns them off and on.
{
  let session = loadDoorFault('PRACTICE')

  assert.equal(areTrainingAidsOn(session), true)
  assert.equal(applySessionCommand(session, { enabled: false, type: 'SET_TRAINING_AIDS' }, { actor: trainee }).accepted, false, 'only a trainer switches aids')

  session = apply(session, trainer, { enabled: false, type: 'SET_TRAINING_AIDS' })
  assert.equal(areTrainingAidsOn(session), false)
  assert.equal(restoreSession(JSON.parse(JSON.stringify(session))).trainingAids, false, 'the switch survives a restart')

  session = apply(session, trainer, { enabled: true, type: 'SET_TRAINING_AIDS' })
  assert.equal(areTrainingAidsOn(session), true)
}

// Assessment forces aids off, whatever the stored switch says, and the switch is refused.
{
  const session = loadDoorFault('ASSESSMENT')

  assert.equal(session.trainingAids, true)
  assert.equal(areTrainingAidsOn(session), false)
  assert.equal(applySessionCommand(session, { enabled: true, type: 'SET_TRAINING_AIDS' }, { actor: trainer }).accepted, false)
}

// The coach shows the next open step and where it is done.
{
  let session = loadDoorFault('PRACTICE')
  let state = getCoachState(session)

  assert.equal(state.kind, 'step')
  assert.equal(state.kind === 'step' && state.hint.taskId, 'select-door-fault-train')
  assert.deepEqual(state.kind === 'step' && state.hint.monitors, ['LINE_MAP'])
  assert.deepEqual(state.kind === 'step' && state.hint.how, ['Right-click Train 345 on the Line Map'])
  assert.deepEqual(state.kind === 'step' && state.hint.target, { kind: 'train', trainId: '345' })

  session = apply(session, trainee, { trainId: '345', type: 'SELECT_TRAIN', view: 'menu' })
  state = getCoachState(session)
  assert.equal(state.kind === 'step' && state.hint.taskId, 'acknowledge-door-fault')
  assert.deepEqual(state.kind === 'step' && state.hint.monitors, ['ALARMS'])
  assert.deepEqual(state.kind === 'step' && state.hint.target, { kind: 'alarmRow', trainId: '345' })

  // A call step lists only the calls still to make.
  const callTask = trainingScenarioDefinitions.find((item) => item.id === 'door-fault')!.tasks.find((task) => task.id === 'alert-cc-wc-door-fault')!

  assert.deepEqual(getStepHint(session, callTask).how, [
    'Calls → Teleph. → Chief Controller (CC) → Alert CC of the incident',
    'Calls → Teleph. → Works Coordinator (WC) → Alert WC of the fault',
  ])
  session = apply(session, trainee, { request: { messageId: 'cc-alert-incident' }, type: 'LOG_CALL' })
  assert.deepEqual(getStepHint(session, callTask).how, ['Calls → Teleph. → Works Coordinator (WC) → Alert WC of the fault'])
  assert.deepEqual(getStepHint(session, callTask).monitors, ['ALARMS', 'LINE_MAP'])
  assert.deepEqual(getStepHint(session, callTask).target, { channel: 'TELEPHONE', kind: 'calls' })

  // ROUTE and DISPATCH point at the station panel where the train is.
  const routeTask = trainingScenarioDefinitions.find((item) => item.id === 'door-fault')!.tasks.find((task) => task.mappedTaskId === 'setRoute')!

  assert.deepEqual(getStepHint(session, routeTask).target, { command: 'ROUTE', kind: 'stationButton', station: 'PGL' })
}

// Every step of every scenario gets a hint, without text written per step.
for (const definition of trainingScenarioDefinitions) {
  const session = { ...createInitialSession(), activeScenario: { ...createInitialSession().activeScenario, faultLocation: location, id: definition.id, targetTrainId: '345' } }

  for (const task of definition.tasks) {
    const hint = getStepHint(session, task)

    assert.ok(hint.how.length > 0 && hint.how.every(Boolean), `${definition.id} / ${task.id} has a hint`)
    assert.ok(!hint.label.includes('{'), `${definition.id} / ${task.id} label is filled in`)
  }
}
