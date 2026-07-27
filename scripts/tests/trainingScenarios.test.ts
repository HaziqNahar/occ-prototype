import assert from 'node:assert/strict'
import { clearInactiveTimetablePlaybackTrains, createInitialSession, normalizeClientSession } from '../../src/sessionState'
import {
  applyTrainingScenarioRuntimeEvent,
  applyTrainingScenarioWorkflowAction,
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
  completeTrainingScenarioDefinitionTask,
  createTrainingScenarioStartSession,
  getTrainingScenarioCompletionBlockers,
  getTrainingScenarioDefinition,
  getTrainingScenarioTrainActionDetail,
  resetTrainingScenarioRuntime,
  scoreTrainingScenario,
} from '../../src/trainingScenarios'
import {
  RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS,
  SKG_TO_PGC_TIMETABLE_ROUTE_STEPS,
  SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
} from '../../src/screens/line-map/trainMovementRoutes'
import type { TimetablePlaybackPlan } from '../../src/screens/line-map/timetablePlayback'
import type { OccSessionState, TrainState } from '../../src/types'

function withLiveTimetableTrain(session: OccSessionState, trainId: string): OccSessionState {
  const trainPatch = {
    service: 'NB' as const,
    status: 'RUN' as const,
    isMoving: true,
    lineMapVisible: true,
    occupancySegmentId: 'rail-619',
    timetablePlayback: true,
  }
  const trainExists = session.trains.some((train) => train.id === trainId)

  if (trainExists) {
    return {
      ...session,
      trains: session.trains.map((train) => (
        train.id === trainId
          ? { ...train, ...trainPatch }
          : train
      )),
    }
  }

  const train: TrainState = {
    direction: 'right',
    id: trainId,
    service: 'NB',
    status: 'RUN',
    x: 0,
    y: 0,
    ...trainPatch,
  }

  return {
    ...session,
    trains: [...session.trains, train],
  }
}

{
  const launch = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(launch, {
    source: 'Monitor 03 Timetable',
    trainId: '301',
    type: 'TRAIN_SELECTED',
  }).next

  assert.equal(
    getTrainingScenarioTrainActionDetail(launch, '301', 'Train 301 timetable row selected'),
    'Train 301 timetable row selected for Train Launch.',
  )
  assert.equal(
    getTrainingScenarioTrainActionDetail(selected, '309', 'Train 309 timetable row selected'),
    'Train 309 timetable row selected. Active scenario target remains Train 301.',
  )
  assert.equal(
    getTrainingScenarioTrainActionDetail(createInitialSession(), '301', 'Train 301 timetable row selected'),
    'Train 301 timetable row selected.',
  )
}

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
            timetablePlayback: true,
          }
        : train
    )),
  }

  const started = createTrainingScenarioStartSession(liveSession, 'TRAIN_WITHDRAWAL')

  assert.equal(started.activeScenario.id, 'train-withdrawal')
  assert.equal(started.activeScenario.targetTrainId, undefined)
  assert.equal(started.selectedTrainId, liveSession.selectedTrainId)
  assert.equal(started.scenarioMode, 'RUNNING')
  assert.equal(started.lineMap.routeSegments['rail-619'].trainId, '342')
  assert.equal(started.trains.find((train) => train.id === '342')?.isMoving, true)
  assert.equal(started.trains.find((train) => train.id === '342')?.lineMapVisible, true)
  assert.deepEqual(started.scenarioTasks, createInitialSession().scenarioTasks)
  assert.equal(started.evidenceLog.length, 1)
}

{
  const current = createInitialSession()
  const assessmentSession = {
    ...current,
    trainingMode: 'ASSESSMENT' as const,
    trains: current.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: true,
          }
        : train
    )),
  }
  const started = createTrainingScenarioStartSession(assessmentSession, 'TRAIN_WITHDRAWAL')

  assert.equal(started.activeScenario.targetTrainId, undefined)
  const selected = applyTrainingScenarioRuntimeEvent(started, {
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'TRAIN_SELECTED',
  }).next
  assert.equal(selected.activeScenario.targetTrainId, '342')
}

{
  const current = createInitialSession()
  const withLiveWithdrawalTrain = {
    ...current,
    trains: current.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: true,
          }
        : train
    )),
  }
  const started = createTrainingScenarioStartSession(withLiveWithdrawalTrain, 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(started, {
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'TRAIN_SELECTED',
  }).next
  const cleaned = clearInactiveTimetablePlaybackTrains(selected, new Set())
  const train342 = cleaned.trains.find((train) => train.id === '342')

  assert.equal(selected.activeScenario.targetTrainId, '342')
  assert.equal(train342?.lineMapVisible, true)
  assert.equal(train342?.timetablePlayback, false)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 02 Line Map',
    trainId: '312',
    type: 'TRAIN_SELECTED',
  })

  assert.equal(selected.allowed, false)
  assert.equal(selected.next.activeScenario.targetTrainId, undefined)
  assert.equal(selected.next.scenarioNotice.tone, 'warning')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const confirmed = completeTrainingScenarioDefinitionTask(
    current,
    'select-withdrawal-train',
    'IOS Scenario Runtime',
  )

  assert.equal(confirmed.allowed, false)
  assert.equal(confirmed.next.scenarioTasks.selectTrain, false)
  assert.equal(confirmed.next.scenarioNotice.tone, 'warning')
}

{
  const withLiveWithdrawalTrain = withLiveTimetableTrain(createInitialSession(), '321')
  const armed = createTrainingScenarioStartSession(withLiveWithdrawalTrain, 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(armed, {
    source: 'Monitor 02 Line Map',
    trainId: '321',
    type: 'TRAIN_SELECTED',
  }).next
  const score = scoreTrainingScenario(selected)

  assert.equal(score.completedTasks, 1)
  assert.equal(score.score, 10)
  assert.equal(score.taskResults.find((task) => task.id === 'select-withdrawal-train')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, false)
  assert.equal(score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')?.complete, false)
}

{
  const withLiveWithdrawalTrain = withLiveTimetableTrain(createInitialSession(), '321')
  const armed = createTrainingScenarioStartSession(withLiveWithdrawalTrain, 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(armed, {
    source: 'Monitor 02 Line Map',
    trainId: '321',
    type: 'TRAIN_SELECTED',
  }).next
  const manualRouteConfirm = completeTrainingScenarioDefinitionTask(
    selected,
    'set-withdrawal-route',
    'IOS Scenario Runtime',
  )
  const routeSet = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R608_803',
    source: 'Monitor 02 Line Map',
    trainId: '321',
    type: 'ROUTE_SET',
  }).next

  assert.equal(manualRouteConfirm.allowed, false)
  assert.equal(scoreTrainingScenario(manualRouteConfirm.next).taskResults.find((task) => task.id === 'set-withdrawal-route')?.complete, false)
  assert.equal(scoreTrainingScenario(routeSet).taskResults.find((task) => task.id === 'set-withdrawal-route')?.complete, true)
}

{
  const withLiveWithdrawalTrain = withLiveTimetableTrain(createInitialSession(), '321')
  const armed = createTrainingScenarioStartSession(withLiveWithdrawalTrain, 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(armed, {
    source: 'Monitor 02 Line Map',
    trainId: '321',
    type: 'TRAIN_SELECTED',
  }).next
  const confirmed = completeTrainingScenarioDefinitionTask(
    selected,
    'declare-depot-destination',
    'IOS Scenario Runtime',
  )

  assert.equal(confirmed.allowed, false)
  assert.equal(confirmed.next.scenarioNotice.tone, 'warning')
  assert.equal(scoreTrainingScenario(confirmed.next).taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, false)
}

{
  const withLiveWithdrawalTrain = {
    ...createInitialSession(),
    trains: createInitialSession().trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: true,
          }
        : train
    )),
  }
  const armed = createTrainingScenarioStartSession(withLiveWithdrawalTrain, 'TRAIN_WITHDRAWAL')
  const selected = applyTrainingScenarioRuntimeEvent(armed, {
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'TRAIN_SELECTED',
  }).next
  const storedHidden = {
    ...selected,
    trains: selected.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: false,
            timetablePlayback: true,
          }
        : train
    )),
  }
  const normalized = normalizeClientSession(storedHidden)
  const train342 = normalized.trains.find((train) => train.id === '342')

  assert.equal(train342?.lineMapVisible, true)
  assert.equal(train342?.timetablePlayback, false)
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
  const current = createInitialSession()
  let session = createTrainingScenarioStartSession({
    ...current,
    trains: current.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: true,
          }
        : train
    )),
  }, 'TRAIN_WITHDRAWAL')

  session = applyTrainingScenarioRuntimeEvent(session, {
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'TRAIN_SELECTED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    routeLabel: 'Route R608_803',
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'ROUTE_SET',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    platformSiding: 'SKGS',
    source: 'Line Map Train Control',
    station: 'SKG',
    trainId: '342',
    type: 'ARRIVAL_DESTINATION_SET',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    routeLabel: 'Route R608_803',
    source: 'Line Map Train Control',
    trainId: '342',
    type: 'DEPARTURE_TIME_CONFIRMED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    platformSiding: 'RT2D',
    source: 'Line Map Train Control',
    station: 'NED',
    trainId: '342',
    type: 'ARRIVAL_DESTINATION_SET',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    routeLabel: 'Route R608_803',
    source: 'Line Map Train Control',
    trainId: '342',
    type: 'DEPARTURE_TIME_CONFIRMED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    routeLabel: 'Route R608_803',
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'DEPOT_ENDPOINT_REACHED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    source: 'IOS Trainer Review',
    type: 'SCENARIO_REVIEWED',
  }).next

  const score = scoreTrainingScenario(session)

  assert.equal(session.scenarioTasks.selectTrain, true)
  assert.equal(session.scenarioTasks.setRoute, true)
  assert.equal(session.scenarioTasks.dispatchTrain, true)
  assert.equal(session.scenarioTasks.completeScenario, true)
  assert.equal(score.taskResults.find((task) => task.id === 'declare-last-station-destination')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'move-to-s608-hold')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'verify-depot-endpoint')?.complete, true)
  assert.equal(score.result, 'PASS')
}

{
  let session = createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT')

  session = applyTrainingScenarioRuntimeEvent(session, {
    source: 'Monitor 02 Line Map',
    trainId: '317',
    type: 'TRAIN_SELECTED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    source: 'Monitor 01 Alarms',
    trainId: '317',
    type: 'ALARM_ACKNOWLEDGED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    commandLabel: 'Confirm Closed/Locked',
    source: 'Monitor 02 Line Map',
    summaryStatus: 'CLOSED/LOCKED',
    trainId: '317',
    type: 'DOOR_COMMAND_CONFIRMED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    routeLabel: 'Line Map route command',
    source: 'Monitor 02 Line Map',
    trainId: '317',
    type: 'ROUTE_SET',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    commandLabel: 'Authorize Movement',
    source: 'Monitor 02 Line Map',
    summaryStatus: 'AUTHORIZED',
    trainId: '317',
    type: 'DOOR_COMMAND_CONFIRMED',
  }).next
  session = applyTrainingScenarioRuntimeEvent(session, {
    source: 'IOS Trainer Review',
    type: 'SCENARIO_REVIEWED',
  }).next

  const score = scoreTrainingScenario(session)

  assert.equal(session.scenarioTasks.selectTrain, true)
  assert.equal(session.scenarioTasks.ackAlarm, true)
  assert.equal(session.scenarioTasks.setRoute, true)
  assert.equal(session.scenarioTasks.dispatchTrain, true)
  assert.equal(session.scenarioTasks.completeScenario, true)
  assert.equal(score.taskResults.find((task) => task.id === 'apply-door-procedure')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'route-after-door-fault')?.complete, true)
  assert.equal(score.result, 'PASS')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 02 Line Map',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const train306 = selected.trains.find((train) => train.id === '306')
  const launchSignalStep = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]
  assert.equal(train306?.lineMapVisible, true)
  assert.equal(train306?.timetablePlayback, false)
  assert.equal(train306?.occupancySegmentId, launchSignalStep.segmentId)
  assert.equal(train306?.x, launchSignalStep.point.x)
  assert.equal(train306?.y, launchSignalStep.point.y)
  assert.equal(train306?.isMoving, false)
  assert.equal(train306?.status, 'WAIT')
  const wrongTrainRoute = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R655_617',
    source: 'Monitor 02 Line Map',
    trainId: '315',
    type: 'ROUTE_SET',
  }).next
  const route = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R655_617',
    source: 'Monitor 02 Line Map',
    trainId: '306',
    type: 'ROUTE_SET',
  }).next
  const stagedTrain306 = route.trains.find((train) => train.id === '306')

  assert.equal(current.activeScenario.targetTrainId, undefined, 'launch should start without a target')
  assert.equal(selected.activeScenario.targetTrainId, '306', 'launch should bind selected train')
  assert.equal(selected.scenarioTasks.selectTrain, true, 'launch selected train should complete select task')
  assert.equal(wrongTrainRoute.scenarioTasks.setRoute, false, 'launch should ignore route for a different train')
  assert.equal(route.scenarioTasks.setRoute, true, 'launch should accept route for selected train')
  assert.equal(stagedTrain306?.occupancySegmentId, launchSignalStep.segmentId)
  assert.equal(stagedTrain306?.x, launchSignalStep.point.x)
  assert.equal(stagedTrain306?.y, launchSignalStep.point.y)
  assert.equal(stagedTrain306?.isMoving, false)
  assert.equal(stagedTrain306?.status, 'WAIT')
}

{
  const launchSignalStep = RT1_S655_TO_SKG_LAUNCH_ROUTE_STEPS[1]
  const current = createTrainingScenarioStartSession({
    ...createInitialSession(),
    timetableRows: [{
      destinationPoint: 'PGCN',
      destinationTime: '15:20:33',
      dwell: '0:35',
      originPoint: 'HBFS',
      originTime: '14:37:00',
      revision: '',
      run: 'NB',
      sched: '1188',
      selectedStation: 'SKG',
      speed: '',
      state: '',
      stationPoint: 'SKG',
      stationTime: '15:09:30',
      train: '322',
    }],
  }, 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 03 Timetable',
    trainId: '322',
    type: 'TRAIN_SELECTED',
  }).next
  const selectedAgain = applyTrainingScenarioRuntimeEvent(selected, {
    source: 'Monitor 03 Timetable',
    trainId: '322',
    type: 'TRAIN_SELECTED',
  }).next
  const train322 = selected.trains.find((train) => train.id === '322')

  assert.equal(selected.activeScenario.targetTrainId, '322', 'launch should bind an NB SKG timetable row even when origin is HBFS')
  assert.equal(selected.scenarioTasks.selectTrain, true, 'launch timetable selection should complete select task')
  assert.equal(selected.scenarioNotice.text, 'Train 322 selected for launch.')
  assert.equal(selectedAgain.scenarioNotice.text, 'Train 322 selected for launch.')
  assert.equal(train322?.lineMapVisible, true, 'selected launch train should appear on the line map')
  assert.equal(train322?.occupancySegmentId, launchSignalStep.segmentId, 'selected launch train should stage at rail-653')
  assert.equal(train322?.timetablePlayback, false, 'selected launch train should be removed from automatic timetable playback')
}

{
  const current = createTrainingScenarioStartSession({
    ...createInitialSession(),
    timetableRows: [{
      destinationPoint: 'PGCN',
      destinationTime: '15:20:33',
      dwell: '0:35',
      originPoint: 'HBFS',
      originTime: '14:37:00',
      revision: '',
      run: 'NB',
      sched: '1189',
      selectedStation: 'SKG',
      speed: '',
      state: '',
      stationPoint: 'SKGN',
      stationTime: '15:09:30',
      train: '323',
    }],
  }, 'TRAIN_LAUNCH')
  const selection = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 03 Timetable',
    trainId: '323',
    type: 'TRAIN_SELECTED',
  })

  assert.equal(selection.allowed, true, 'SKG platform point variants should remain eligible launch rows')
  assert.equal(selection.next.activeScenario.targetTrainId, '323')
  assert.equal(selection.next.trains.find((train) => train.id === '323')?.lineMapVisible, true)
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
  const ignoredWithoutSelection = applyTrainingScenarioTimetableStep(current, plan, 0)
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'IOS Scenario Runtime',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const routeSet = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R655_617',
    source: 'Monitor 02 Line Map',
    trainId: '306',
    type: 'ROUTE_SET',
  }).next
  const launched = applyTrainingScenarioTimetableStep(routeSet, plan, 0)
  const ignoredDifferentLaunchTrain = applyTrainingScenarioTimetableStep(launched, { ...plan, trainId: '315' }, 0)
  const mainlineStepIndex = plan.steps.findIndex((step) => step.segmentId === 'rail-617')
  const mainline = applyTrainingScenarioTimetableStep(launched, plan, mainlineStepIndex)
  const playbackCompleted = {
    ...mainline,
    trains: mainline.trains.map((train) => (
      train.id === '306'
        ? {
            ...train,
            isMoving: false,
            lineMapVisible: false,
            occupancySegmentId: undefined,
            status: 'WAIT' as const,
            timetablePlayback: false,
          }
        : train
    )),
  }
  const complete = applyTrainingScenarioTimetableCompletion(playbackCompleted, plan)
  const score = scoreTrainingScenario(complete)
  const completedTrain = complete.trains.find((train) => train.id === '306')
  const lastStep = plan.steps[plan.steps.length - 1]

  assert.equal(current.activeScenario.targetTrainId, undefined)
  assert.equal(ignoredWithoutSelection.activeScenario.targetTrainId, undefined)
  assert.equal(launched.activeScenario.targetTrainId, '306')
  assert.equal(launched.selectedTrainId, '306')
  assert.equal(ignoredDifferentLaunchTrain.activeScenario.targetTrainId, '306')
  assert.equal(ignoredDifferentLaunchTrain.selectedTrainId, '306')
  assert.equal(complete.scenarioTasks.setRoute, true, 'launch timetable route task should be complete')
  assert.equal(complete.scenarioTasks.dispatchTrain, true, 'launch timetable dispatch task should be complete')
  assert.equal(complete.scenarioTasks.completeScenario, false, 'launch timetable playback should not auto-complete IOS review')
  assert.equal(completedTrain?.lineMapVisible, true, 'launch scenario train should remain visible after timetable completion')
  assert.equal(completedTrain?.timetablePlayback, true, 'launch scenario train should remain available to timetable playback after handoff')
  assert.equal(completedTrain?.occupancySegmentId, lastStep.segmentId, 'launch scenario train should remain positioned at the final route segment')
  assert.equal(score.taskResults.some((task) => task.id === 'confirm-service-mode'), false, 'launch scenario should not include service-mode confirmation task')
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, false, 'launch timetable should leave IOS review incomplete')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const initialScore = scoreTrainingScenario(current)
  const scoreWithLooseEvidence = scoreTrainingScenario({
    ...current,
    evidenceLog: [
      {
        action: 'Route and departure note',
        detail: 'A route, launch, mainline service, timetable service, dispatch, and departure were mentioned before trainee action.',
        id: 'loose-launch-evidence',
        result: 'accepted',
        source: 'IOS Scenario Control',
        time: '00:00:00',
      },
    ],
  })
  assert.equal(initialScore.completedTasks, 0, 'no tasks should be complete upon starting train launch scenario')
  assert.equal(initialScore.score, 0, 'score should be 0 upon starting train launch scenario')
  assert.equal(scoreWithLooseEvidence.completedTasks, 0, 'loose launch evidence should not complete launch tasks')
  assert.equal(scoreWithLooseEvidence.score, 0, 'loose launch evidence should not score launch tasks')
  for (const task of initialScore.taskResults) {
    assert.equal(task.complete, false, `task ${task.id} should not be complete upon starting train launch scenario`)
  }

  const rejectedBeforeSelection = applyTrainingScenarioWorkflowAction(current, 'PREPARE_LAUNCH_ROUTE')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'IOS Scenario Runtime',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const prepared = applyTrainingScenarioWorkflowAction(selected, 'PREPARE_LAUNCH_ROUTE')
  const dispatched = applyTrainingScenarioWorkflowAction(prepared.next, 'DISPATCH_LAUNCH')
  const verified = applyTrainingScenarioWorkflowAction(dispatched.next, 'VERIFY_LAUNCH_MAINLINE')
  const launchTrain = verified.next.trains.find((train) => train.id === '306')
  const score = scoreTrainingScenario(verified.next)

  assert.equal(rejectedBeforeSelection.allowed, false, 'launch workflow should reject before train selection')
  assert.equal(rejectedBeforeSelection.next.scenarioNotice.tone, 'warning', 'launch workflow rejection should warn')
  assert.equal(prepared.allowed, true, 'launch workflow route preparation should be allowed')
  assert.equal(prepared.next.lineMap.routeSegments['route-r655-617-command']?.status, 'SET', 'launch route command should be set')
  assert.equal(prepared.next.lineMap.routeSegments['rail-655']?.status, 'SET', 'rail-655 should be set after launch preparation')
  assert.equal(prepared.next.lineMap.routeSegments['rail-653']?.status, 'SET', 'rail-653 should be set after launch preparation')
  assert.equal(dispatched.allowed, true, 'launch dispatch should be allowed')
  assert.equal(dispatched.next.lineMap.routeSegments['route-r655-617-command']?.status, 'SET', 'launch route command should stay set on dispatch')
  assert.equal(dispatched.next.lineMap.routeSegments['rail-655']?.status, 'UNSET', 'rail-655 should be passed after launch staging')
  assert.equal(dispatched.next.lineMap.routeSegments['rail-653']?.status, 'DISPATCHED', 'rail-653 should be dispatched on launch')
  assert.equal(verified.allowed, true, 'launch verification should be allowed')
  assert.equal(verified.next.lineMap.routeSegments['rail-655']?.status, 'UNSET', 'rail-655 should be unset after launch passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-653']?.status, 'UNSET', 'rail-653 should be unset after launch passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-P609']?.status, 'UNSET', 'rail-P609 should be unset after launch passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-P611']?.status, 'UNSET', 'rail-P611 should be unset after launch passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-617']?.status, 'DISPATCHED', 'rail-617 should be occupied after launch verification')
  assert.equal(launchTrain?.occupancySegmentId, 'rail-617', 'launch train should occupy rail-617')
  assert.equal(launchTrain?.isMoving, true, 'launch train should be moving')
  assert.equal(launchTrain?.readinessMode, 'MAINLINE_SERVICE', 'launch train should be mainline service')
  assert.equal(verified.next.scenarioTasks.selectTrain, true, 'launch selectTrain scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.setRoute, true, 'launch setRoute scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.dispatchTrain, true, 'launch dispatchTrain scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.completeScenario, true, 'launch completeScenario task should be complete')
  assert.equal(verified.next.scenarioMode, 'COMPLETE', 'launch workflow should complete scenario')
  assert.equal(score.taskResults.some((task) => task.id === 'confirm-service-mode'), false, 'launch scenario should not include service-mode confirmation task')
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, true, 'launch review task should be complete')
  assert.equal(score.result, 'PASS', 'launch workflow score should pass')
}

{
  const initial = createInitialSession()
  const current = createTrainingScenarioStartSession({
    ...initial,
    trains: initial.trains.map((train) => (
      train.id === '342'
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: true,
          }
        : train
    )),
  }, 'TRAIN_WITHDRAWAL')
  const rejectedBeforeSelection = applyTrainingScenarioWorkflowAction(current, 'DECLARE_WITHDRAWAL_DESTINATION')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'TRAIN_SELECTED',
  }).next
  const routeSet = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R608_803',
    source: 'Monitor 02 Line Map',
    trainId: '342',
    type: 'ROUTE_SET',
  }).next
  const declared = applyTrainingScenarioWorkflowAction(routeSet, 'DECLARE_WITHDRAWAL_DESTINATION')
  const triggered = applyTrainingScenarioWorkflowAction(declared.next, 'TRIGGER_WITHDRAWAL_MOVEMENT')
  const verified = applyTrainingScenarioWorkflowAction(triggered.next, 'VERIFY_WITHDRAWAL_ENDPOINT')
  const endpointTrain = verified.next.trains.find((train) => train.id === '342')
  const score = scoreTrainingScenario(verified.next)

  assert.equal(rejectedBeforeSelection.allowed, false, 'withdrawal destination action should reject before train selection')
  assert.equal(rejectedBeforeSelection.next.scenarioNotice.tone, 'warning', 'withdrawal rejection should warn')
  assert.equal(declared.allowed, true, 'withdrawal destination workflow should be allowed')
  assert.equal(declared.next.lineMap.routeSegments['route-r608-803-command']?.status, 'SET', 'withdrawal route command should be set')
  assert.equal(declared.next.lineMap.routeSegments['rail-618']?.status, 'SET', 'rail-618 should be set for withdrawal')
  assert.equal(triggered.allowed, true, 'withdrawal movement workflow should be allowed')
  assert.equal(triggered.next.lineMap.routeSegments['rail-618']?.status, 'DISPATCHED', 'rail-618 should dispatch withdrawal train')
  assert.equal(triggered.next.lineMap.routeSegments['rail-616']?.status, 'DISPATCHED', 'rail-616 should dispatch withdrawal train')
  assert.equal(verified.allowed, true, 'withdrawal endpoint verification should be allowed')
  assert.equal(verified.next.lineMap.routeSegments['rail-618']?.status, 'UNSET', 'rail-618 should be unset after withdrawal passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-650']?.status, 'UNSET', 'rail-650 should be unset after withdrawal passes')
  assert.equal(verified.next.lineMap.routeSegments['rail-652']?.status, 'DISPATCHED', 'rail-652 should be occupied at withdrawal endpoint')
  assert.equal(endpointTrain?.occupancySegmentId, 'rail-652', 'withdrawal train should stay at rail-652')
  assert.equal(endpointTrain?.isMoving, false, 'withdrawal train should stop at endpoint')
  assert.equal(endpointTrain?.status, 'WAIT', 'withdrawal train should wait at endpoint')
  assert.equal(verified.next.scenarioTasks.selectTrain, true, 'withdrawal selectTrain scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.setRoute, true, 'withdrawal setRoute scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.dispatchTrain, true, 'withdrawal dispatchTrain scenario task should be complete')
  assert.equal(verified.next.scenarioTasks.completeScenario, true, 'withdrawal completeScenario task should be complete')
  assert.equal(verified.next.scenarioMode, 'COMPLETE', 'withdrawal workflow should complete scenario')
  assert.equal(score.taskResults.find((task) => task.id === 'declare-last-station-destination')?.complete, true, 'withdrawal last-station destination task should be complete')
  assert.equal(score.taskResults.find((task) => task.id === 'move-to-s608-hold')?.complete, true, 'withdrawal S608 hold movement task should be complete')
  assert.equal(score.taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, true, 'withdrawal depot destination task should be complete')
  assert.equal(score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')?.complete, true, 'withdrawal depot movement task should be complete')
  assert.equal(score.taskResults.find((task) => task.id === 'verify-depot-endpoint')?.complete, true, 'withdrawal endpoint task should be complete')
  assert.equal(score.taskResults.find((task) => task.id === 'review-withdrawal-outcome')?.complete, true, 'withdrawal review task should be complete')
  assert.equal(score.result, 'PASS', 'withdrawal workflow score should pass')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT')
  const armedScore = scoreTrainingScenario(current)
  const rejectedAck = applyTrainingScenarioWorkflowAction(current, 'ACKNOWLEDGE_DOOR_FAULT')
  const injected = applyTrainingScenarioWorkflowAction(current, 'INJECT_DOOR_FAULT')
  const acknowledged = applyTrainingScenarioWorkflowAction(injected.next, 'ACKNOWLEDGE_DOOR_FAULT')
  const procedure = applyTrainingScenarioWorkflowAction(acknowledged.next, 'APPLY_DOOR_FAULT_PROCEDURE')
  const recovery = applyTrainingScenarioWorkflowAction(procedure.next, 'AUTHORISE_DOOR_FAULT_RECOVERY')
  const complete = applyTrainingScenarioWorkflowAction(recovery.next, 'COMPLETE_DOOR_FAULT_REVIEW')
  const train317 = complete.next.trains.find((train) => train.id === '317')
  const score = scoreTrainingScenario(complete.next)

  assert.equal(armedScore.taskResults.find((task) => task.id === 'apply-door-procedure')?.complete, false)
  assert.equal(rejectedAck.allowed, false)
  assert.equal(rejectedAck.next.scenarioNotice.tone, 'warning')
  assert.equal(injected.allowed, true)
  assert.equal(injected.next.scenarioTasks.selectTrain, true)
  assert.equal(injected.next.trains.find((train) => train.id === '317')?.doorFailureState, 'FAULT_ALARM')
  assert.equal(injected.next.trains.find((train) => train.id === '317')?.status, 'HOLD')
  assert.equal(injected.next.alarmSummaryRows[0].tone, 'red')
  assert.equal(acknowledged.allowed, true)
  assert.equal(acknowledged.next.scenarioTasks.ackAlarm, true)
  assert.equal(procedure.allowed, true)
  assert.equal(procedure.next.trains.find((train) => train.id === '317')?.doorFailureState, 'CLOSED_LOCKED_CONFIRMED')
  assert.equal(recovery.allowed, true)
  assert.equal(recovery.next.scenarioTasks.setRoute, true)
  assert.equal(recovery.next.scenarioTasks.dispatchTrain, true)
  assert.equal(recovery.next.trains.find((train) => train.id === '317')?.doorFailureState, 'AUTHORIZED_TO_MOVE')
  assert.equal(complete.allowed, true)
  assert.equal(complete.next.scenarioTasks.completeScenario, true)
  assert.equal(complete.next.scenarioMode, 'COMPLETE')
  assert.equal(train317?.doorFailureState, 'AUTHORIZED_TO_MOVE')
  assert.equal(train317?.status, 'WAIT')
  assert.equal(train317?.isMoving, false)
  assert.equal(score.taskResults.find((task) => task.id === 'apply-door-procedure')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'review-door-fault-outcome')?.complete, true)
  assert.equal(score.result, 'PASS')
}

{
  const armed = createTrainingScenarioStartSession(
    withLiveTimetableTrain(createInitialSession(), '347'),
    'TRAIN_WITHDRAWAL',
  )
  const selected = applyTrainingScenarioRuntimeEvent(armed, {
    source: 'Monitor 02 Line Map',
    trainId: '347',
    type: 'TRAIN_SELECTED',
  }).next
  const routeSet = applyTrainingScenarioRuntimeEvent(selected, {
    routeLabel: 'Route R608_803',
    source: 'Line Map',
    trainId: '347',
    type: 'ROUTE_SET',
  }).next
  const lastStationArrivalSet = applyTrainingScenarioRuntimeEvent(routeSet, {
    platformSiding: ' skgs ',
    source: 'Line Map Train Control',
    station: ' skg ',
    trainId: '347',
    type: 'ARRIVAL_DESTINATION_SET',
  }).next
  const holdDepartureConfirmed = applyTrainingScenarioRuntimeEvent(lastStationArrivalSet, {
    source: 'Line Map Train Control',
    trainId: '347',
    type: 'DEPARTURE_TIME_CONFIRMED',
  }).next
  const depotArrivalSet = applyTrainingScenarioRuntimeEvent(holdDepartureConfirmed, {
    platformSiding: ' rt2d ',
    source: 'Line Map Train Control',
    station: ' ned ',
    trainId: '347',
    type: 'ARRIVAL_DESTINATION_SET',
  }).next
  const departureConfirmed = applyTrainingScenarioRuntimeEvent(depotArrivalSet, {
    source: 'Line Map Train Control',
    trainId: '347',
    type: 'DEPARTURE_TIME_CONFIRMED',
  }).next
  const score = scoreTrainingScenario(departureConfirmed)

  assert.equal(score.taskResults.find((task) => task.id === 'select-withdrawal-train')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'set-withdrawal-route')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'declare-last-station-destination')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'move-to-s608-hold')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'declare-depot-destination')?.complete, true)
  assert.equal(score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')?.complete, true)
  assert.equal(departureConfirmed.scenarioTasks.selectTrain, true)
  assert.equal(departureConfirmed.scenarioTasks.setRoute, true)
  assert.equal(departureConfirmed.scenarioTasks.dispatchTrain, true)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const mismatch = applyTrainingScenarioWorkflowAction(current, 'DECLARE_WITHDRAWAL_DESTINATION')

  assert.equal(mismatch.allowed, false)
  assert.equal(mismatch.next.scenarioNotice.tone, 'warning')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const reviewed = completeTrainingScenarioDefinitionTask(
    current,
    'review-launch-outcome',
    'IOS Scenario Runtime',
  )
  const score = scoreTrainingScenario(reviewed.next)

  assert.equal(reviewed.allowed, false)
  assert.equal(reviewed.next.scenarioTasks.completeScenario, false)
  assert.equal(reviewed.next.scenarioMode, 'RUNNING')
  assert.equal(reviewed.next.scenarioNotice.tone, 'warning')
  assert.equal(score.taskResults.some((task) => task.id === 'confirm-service-mode'), false)
  assert.equal(score.taskResults.find((task) => task.id === 'review-launch-outcome')?.complete, false)
  assert.deepEqual(
    getTrainingScenarioCompletionBlockers(current).map((task) => task.id),
    ['select-launch-train', 'set-launch-route', 'dispatch-launch-train'],
  )
}

{
  const current = createInitialSession()
  const staleSession = {
    ...current,
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
  const session = createTrainingScenarioStartSession(staleSession, 'TRAIN_WITHDRAWAL')

  const score = scoreTrainingScenario(session)
  const depotDestinationTask = score.taskResults.find((task) => task.id === 'declare-depot-destination')
  const departureTask = score.taskResults.find((task) => task.id === 'trigger-withdrawal-movement')

  assert.equal(session.scenarioTasks.dispatchTrain, false)
  assert.equal(session.scenarioTasks.selectTrain, false)
  assert.equal(session.scenarioTasks.setRoute, false)
  assert.equal(depotDestinationTask?.complete, false)
  assert.equal(departureTask?.complete, false)
  assert.equal(score.score, 0)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const withLiveState = {
    ...current,
    lineMap: {
      ...current.lineMap,
      routeSegments: {
        ...current.lineMap.routeSegments,
        'rail-619': {
          segmentId: 'rail-619',
          status: 'DISPATCHED' as const,
          trainId: '342',
          updatedAt: 1,
        },
      },
    },
    trains: current.trains.map((train) => (
      train.id === '312'
        ? {
            ...train,
            doorFailureState: 'FAULT_ALARM' as const,
            itamaAuthorisedPreparationConfirmed: false,
            itamaGranted: false,
            itamaNotAuthorisedPreparationConfirmed: false,
            itamaStatus: 'NOT_GRANTED' as const,
            readinessMode: 'MAINLINE_OFF_SERVICE' as const,
          }
        : train
    )),
  }

  const reset = resetTrainingScenarioRuntime(withLiveState)
  const resetTrain = reset.trains.find((train) => train.id === '312')

  assert.equal(reset.activeScenario.id, 'idle')
  assert.equal(reset.scenarioMode, 'IDLE')
  assert.deepEqual(reset.scenarioTasks, createInitialSession().scenarioTasks)
  assert.equal(reset.evidenceLog.length, 0)
  assert.equal(reset.lineMap.routeSegments['rail-619'], undefined)
  assert.equal(resetTrain?.itamaAuthorisedPreparationConfirmed, false)
  assert.equal(resetTrain?.doorFailureState, undefined)
  assert.equal(resetTrain?.itamaGranted, true)
  assert.equal(resetTrain?.itamaNotAuthorisedPreparationConfirmed, false)
  assert.equal(resetTrain?.itamaStatus, 'GRANTED')
  assert.equal(resetTrain?.readinessMode, 'MAINLINE_SERVICE')
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'IOS Scenario Runtime',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const prepared = applyTrainingScenarioWorkflowAction(selected, 'PREPARE_LAUNCH_ROUTE').next
  const stagedTrain = prepared.trains.find((train) => train.id === '306')

  const reset = resetTrainingScenarioRuntime(prepared)
  const resetTrain = reset.trains.find((train) => train.id === '306')

  assert.equal(prepared.activeScenario.targetTrainId, '306')
  assert.equal(prepared.selectedTrainId, '306')
  assert.equal(stagedTrain?.lineMapVisible, true)
  assert.equal(stagedTrain?.occupancySegmentId, 'rail-653')
  assert.equal(prepared.lineMap.routeSegments['route-r655-617-command']?.status, 'SET')
  assert.equal(reset.activeScenario.id, 'idle')
  assert.equal(reset.activeScenario.targetTrainId, undefined)
  assert.equal(reset.selectedTrainId, '317')
  assert.deepEqual(reset.scenarioTasks, createInitialSession().scenarioTasks)
  assert.equal(reset.lineMap.routeSegments['route-r655-617-command'], undefined)
  assert.equal(resetTrain?.lineMapVisible, false)
  assert.equal(resetTrain?.occupancySegmentId, undefined)
  assert.equal(resetTrain?.isMoving, false)
  assert.equal(resetTrain?.readinessMode, 'MAINLINE_SERVICE')
  assert.equal(resetTrain?.itamaStatus, 'GRANTED')
  assert.equal(resetTrain?.doorFailureState, undefined)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'IOS Scenario Runtime',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const handedOff = {
    ...selected,
    lineMap: {
      ...selected.lineMap,
      routeSegments: {
        ...selected.lineMap.routeSegments,
        'rail-617': {
          segmentId: 'rail-617',
          status: 'DISPATCHED' as const,
          trainId: '306',
          updatedAt: 1,
        },
        'route-r655-617-command': {
          segmentId: 'route-r655-617-command',
          status: 'SET' as const,
          trainId: '306',
          updatedAt: 2,
        },
      },
    },
    scenarioTasks: {
      ...selected.scenarioTasks,
      dispatchTrain: true,
      prepareLaunchRoute: true,
    },
    trains: selected.trains.map((train) => (
      train.id === '306'
        ? {
            ...train,
            direction: 'right' as const,
            isMoving: false,
            lineMapVisible: true,
            occupancySegmentId: 'rail-617',
            readinessMode: 'MAINLINE_SERVICE' as const,
            service: 'NB' as const,
            status: 'WAIT' as const,
            timetablePlayback: true,
          }
        : train
    )),
  }

  const reset = resetTrainingScenarioRuntime(handedOff)
  const resetTrain = reset.trains.find((train) => train.id === '306')

  assert.equal(reset.activeScenario.id, 'idle')
  assert.equal(reset.activeScenario.targetTrainId, undefined)
  assert.equal(reset.selectedTrainId, '306')
  assert.deepEqual(reset.scenarioTasks, createInitialSession().scenarioTasks)
  assert.equal(reset.lineMap.routeSegments['rail-617'], undefined)
  assert.equal(reset.lineMap.routeSegments['route-r655-617-command'], undefined)
  assert.equal(resetTrain?.lineMapVisible, true)
  assert.equal(resetTrain?.occupancySegmentId, 'rail-617')
  assert.equal(resetTrain?.isMoving, false)
  assert.equal(resetTrain?.readinessMode, 'MAINLINE_SERVICE')
  assert.equal(resetTrain?.itamaStatus, 'GRANTED')
  assert.equal(resetTrain?.timetablePlayback, true)
}

{
  const current = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_LAUNCH')
  const selected = applyTrainingScenarioRuntimeEvent(current, {
    source: 'IOS Scenario Runtime',
    trainId: '306',
    type: 'TRAIN_SELECTED',
  }).next
  const handedOffWithStalePlaybackFlag = {
    ...selected,
    scenarioTasks: {
      ...selected.scenarioTasks,
      dispatchTrain: true,
      prepareLaunchRoute: true,
    },
    trains: selected.trains.map((train) => (
      train.id === '306'
        ? {
            ...train,
            isMoving: false,
            lineMapVisible: true,
            occupancySegmentId: 'rail-617',
            readinessMode: 'MAINLINE_SERVICE' as const,
            status: 'WAIT' as const,
            timetablePlayback: false,
          }
        : train
    )),
  }

  const reset = resetTrainingScenarioRuntime(handedOffWithStalePlaybackFlag)
  const resetTrain = reset.trains.find((train) => train.id === '306')

  assert.equal(reset.activeScenario.id, 'idle')
  assert.equal(resetTrain?.lineMapVisible, true)
  assert.equal(resetTrain?.occupancySegmentId, 'rail-617')
  assert.equal(resetTrain?.isMoving, false)
  assert.equal(resetTrain?.timetablePlayback, true)
}

{
  const withdrawal = createTrainingScenarioStartSession(createInitialSession(), 'TRAIN_WITHDRAWAL')
  const reset = resetTrainingScenarioRuntime(withdrawal)
  const launch = createTrainingScenarioStartSession(reset, 'TRAIN_LAUNCH')

  assert.equal(reset.scenarioMode, 'IDLE')
  assert.equal(reset.activeScenario.id, 'idle')
  assert.equal(launch.scenarioMode, 'RUNNING')
  assert.equal(launch.activeScenario.id, 'train-launch')
  assert.equal(launch.activeScenario.targetTrainId, undefined)
  assert.equal(launch.selectedTrainId, reset.selectedTrainId)
  assert.equal(launch.scenarioTasks.selectTrain, false)
}
