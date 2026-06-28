import assert from 'node:assert/strict'
import { createInitialSession } from '../../src/sessionState'
import {
  applyTrainingScenarioWorkflowAction,
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
  completeTrainingScenarioDefinitionTask,
  createTrainingScenarioStartSession,
  getTrainingScenarioDefinition,
  scoreTrainingScenario,
} from '../../src/trainingScenarios'
import {
  SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
  SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
} from '../../src/screens/line-map/trainMovementRoutes'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'

{
  const current = createInitialSession()
  const liveSession = {
    ...current,
    lineMap: {
      ...current.lineMap,
      routeSegments: {
        'rail-619': {
          segmentId: 'rail-619',
          status: 'DISPATCHED' as const,
          trainId: '342',
          updatedAt: 1,
        },
      },
    },
    scenarioTasks: {
      ...current.scenarioTasks,
      completeScenario: true,
      dispatchTrain: true,
      selectTrain: true,
      setRoute: true,
    },
    trains: current.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            isMoving: true,
            lineMapVisible: true,
            occupancySegmentId: 'rail-619',
          }
        : train
    )),
  }

  const started = createTrainingScenarioStartSession(liveSession, 'TRAIN_WITHDRAWAL')

  assert.equal(started.activeScenario.id, 'train-withdrawal')
  assert.equal(started.selectedTrainId, '312')
  assert.equal(started.scenarioMode, 'RUNNING')
  assert.equal(started.lineMap.routeSegments['rail-619'].trainId, '342')
  assert.equal(started.trains.find((train) => train.id === '342')?.isMoving, true)
  assert.deepEqual(started.scenarioTasks, createInitialSession().scenarioTasks)
}

{
  const definition = getTrainingScenarioDefinition('train-withdrawal')

  assert.equal(definition.kind, 'TRAIN_WITHDRAWAL')
  assert.equal(definition.tasks.some((task) => task.id === 'declare-depot-destination'), true)
}

{
  const score = scoreTrainingScenario(createInitialSession())

  assert.equal(score.score, 0)
  assert.equal(score.totalTasks, 0)
  assert.deepEqual(score.taskResults, [])
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const plan: TimetablePlaybackPlan = {
    endSeconds: 360,
    firstStepIndex: 0,
    from: 'SKG',
    panelCode: 'SKG',
    platformStops: [
      { platformCode: 'SKG', stepIndex: SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX, track: 'NB' },
    ],
    routeLabel: 'Timetable path RT1 launch to SKG/PGL/PGC upper mainline',
    routeSteps: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
    scheduleNumber: '1003',
    service: 'NB',
    signalRouteRefs: ['Route R655_617'],
    startSeconds: 0,
    stationRouteId: 'timetable-skg-to-pgc-upper-mainline',
    stepOffsetsMs: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS.map(() => 0),
    stepSignedOffsetsMs: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS.map(() => 0),
    steps: SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
    to: 'PGC',
    trainId: '306',
  }
  const launched = applyTrainingScenarioTimetableStep(current, plan, 0)
  const mainline = applyTrainingScenarioTimetableStep(launched, plan, SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX)
  const complete = applyTrainingScenarioTimetableCompletion(mainline, plan)
  const score = scoreTrainingScenario(complete)

  assert.equal(complete.scenarioTasks.setRoute, true)
  assert.equal(complete.scenarioTasks.dispatchTrain, true)
  assert.equal(complete.scenarioTasks.completeScenario, false)
  assert.equal(score.taskResults.find((task) => task.id === 'confirm-service-mode')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, false)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const prepared = applyTrainingScenarioWorkflowAction(current, 'PREPARE_LAUNCH_ROUTE')
  const dispatched = applyTrainingScenarioWorkflowAction(prepared.next, 'DISPATCH_LAUNCH')
  const verified = applyTrainingScenarioWorkflowAction(dispatched.next, 'VERIFY_LAUNCH_MAINLINE')
  const launchTrain = verified.next.trains.find((train) => train.id === '306')
  const score = scoreTrainingScenario(verified.next)

  assert.equal(prepared.allowed, true)
  assert.equal(prepared.next.lineMap.routeSegments['route-r655-617-command']?.status, 'SET')
  assert.equal(prepared.next.lineMap.routeSegments['rail-653']?.status, 'SET')
  assert.equal(dispatched.allowed, true)
  assert.equal(dispatched.next.lineMap.routeSegments['route-r655-617-command']?.status, 'SET')
  assert.equal(dispatched.next.lineMap.routeSegments['rail-653']?.status, 'DISPATCHED')
  assert.equal(dispatched.next.lineMap.routeSegments['rail-P609']?.status, 'DISPATCHED')
  assert.equal(verified.allowed, true)
  assert.equal(verified.next.lineMap.routeSegments['rail-653']?.status, 'UNSET')
  assert.equal(verified.next.lineMap.routeSegments['rail-P609']?.status, 'UNSET')
  assert.equal(verified.next.lineMap.routeSegments['rail-P611']?.status, 'UNSET')
  assert.equal(verified.next.lineMap.routeSegments['rail-617']?.status, 'DISPATCHED')
  assert.equal(launchTrain?.occupancySegmentId, 'rail-617')
  assert.equal(launchTrain?.isMoving, true)
  assert.equal(launchTrain?.readinessMode, 'MAINLINE_SERVICE')
  assert.equal(verified.next.scenarioTasks.selectTrain, true)
  assert.equal(verified.next.scenarioTasks.setRoute, true)
  assert.equal(verified.next.scenarioTasks.dispatchTrain, true)
  assert.equal(verified.next.scenarioTasks.completeScenario, true)
  assert.equal(verified.next.scenarioMode, 'COMPLETE')
  assert.equal(score.taskResults.find((task) => task.id === 'confirm-service-mode')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, true)
  assert.equal(score.result, 'PASS')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const declared = applyTrainingScenarioWorkflowAction(current, 'DECLARE_WITHDRAWAL_DESTINATION')
  const triggered = applyTrainingScenarioWorkflowAction(declared.next, 'TRIGGER_WITHDRAWAL_MOVEMENT')
  const verified = applyTrainingScenarioWorkflowAction(triggered.next, 'VERIFY_WITHDRAWAL_ENDPOINT')
  const endpointTrain = verified.next.trains.find((train) => train.id === '312')
  const score = scoreTrainingScenario(verified.next)

  assert.equal(declared.allowed, true)
  assert.equal(declared.next.lineMap.routeSegments['route-r608-803-command']?.status, 'SET')
  assert.equal(declared.next.lineMap.routeSegments['rail-618']?.status, 'SET')
  assert.equal(triggered.allowed, true)
  assert.equal(triggered.next.lineMap.routeSegments['rail-618']?.status, 'DISPATCHED')
  assert.equal(triggered.next.lineMap.routeSegments['rail-616']?.status, 'DISPATCHED')
  assert.equal(verified.allowed, true)
  assert.equal(verified.next.lineMap.routeSegments['rail-618']?.status, 'UNSET')
  assert.equal(verified.next.lineMap.routeSegments['rail-650']?.status, 'UNSET')
  assert.equal(verified.next.lineMap.routeSegments['rail-652']?.status, 'DISPATCHED')
  assert.equal(endpointTrain?.occupancySegmentId, 'rail-652')
  assert.equal(endpointTrain?.isMoving, false)
  assert.equal(endpointTrain?.status, 'WAIT')
  assert.equal(verified.next.scenarioTasks.selectTrain, true)
  assert.equal(verified.next.scenarioTasks.setRoute, true)
  assert.equal(verified.next.scenarioTasks.dispatchTrain, true)
  assert.equal(verified.next.scenarioTasks.completeScenario, true)
  assert.equal(verified.next.scenarioMode, 'COMPLETE')
  assert.equal(score.taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'verify-depot-endpoint')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'review-withdrawal-outcome')?.complete, true)
  assert.equal(score.result, 'PASS')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const mismatch = applyTrainingScenarioWorkflowAction(current, 'DECLARE_WITHDRAWAL_DESTINATION')

  assert.equal(mismatch.allowed, false)
  assert.equal(mismatch.next.scenarioNotice.tone, 'warning')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const mainline = completeTrainingScenarioDefinitionTask(
    current,
    'confirm-service-mode',
    'IOS Scenario Runtime',
  )
  const reviewed = completeTrainingScenarioDefinitionTask(
    mainline.next,
    'review-launch-outcome',
    'IOS Scenario Runtime',
  )
  const score = scoreTrainingScenario(reviewed.next)

  assert.equal(mainline.allowed, true)
  assert.equal(reviewed.allowed, true)
  assert.equal(reviewed.next.scenarioTasks.completeScenario, true)
  assert.equal(reviewed.next.scenarioMode, 'COMPLETE')
  assert.equal(score.taskResults.find((task) => task.id === 'confirm-service-mode')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, true)
}

{
  const current = createInitialSession()
  const session = {
    ...createTrainingScenarioStartSession(current, 'TRAIN_WITHDRAWAL'),
    eventRows: [
      {
        asset: 'EMU/312/TRN/OCC',
        level: 'S',
        message: 'Set arrival time destination NED RT2D',
        time: '05/11 11:00:00',
        tone: 'yellow' as const,
        value: 'ARRIVAL TIME',
      },
      {
        asset: 'EMU/312/TRN/OCC',
        level: 'S',
        message: 'Departure time confirmed',
        time: '05/11 11:00:20',
        tone: 'yellow' as const,
        value: 'DEPARTURE TIME',
      },
    ],
    scenarioTasks: {
      ...current.scenarioTasks,
      dispatchTrain: true,
      selectTrain: true,
      setRoute: true,
    },
  }

  const score = scoreTrainingScenario(session)
  const depotDestinationTask = score.taskResults.find((task) => task.id === 'declare-depot-destination')
  const departureTask = score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')

  assert.equal(depotDestinationTask?.complete, true)
  assert.equal(departureTask?.complete, true)
  assert.equal(score.score > 70, true)
}
