const RT1_LAUNCH_STAGING_STEP = {
  occupancySegmentId: 'rail-653',
  x: 3281,
  y: 274,
}

export const SCENARIO_ACTION_TYPES = Object.freeze([
  'SELECT_TRAIN',
  'ACK_ALARM',
  'SET_ROUTE',
  'DISPATCH_TRAIN',
  'COMPLETE_SCENARIO',
])

/**
 * Creates the pure scenario-command reducer used by the HTTP endpoint.
 * Transport, persistence, and broadcasting remain outside this module.
 */
export function createScenarioActionEngine({
  applyAcceptedTask,
  createMonitorEvent,
  createSummaryEvent,
  getScenarioTaskBlocker,
  rejectScenarioAction,
  updateLineMapRouteState,
}) {
  return function applyScenarioAction(session, action) {
    const source = action.source ?? 'Backend Scenario Engine'
    const trainId = action.trainId ?? session.selectedTrainId ?? '317'
    const activeScenarioId = session?.activeScenario?.id ?? ''
    const targetTrainId = getTargetTrainId(session, activeScenarioId)

    if (targetTrainId !== '') {
      if (trainId !== targetTrainId) {
        const reason = `Scenario target is Train ${targetTrainId}. Select Train ${targetTrainId} for this assessment action.`

        return {
          accepted: false,
          reason,
          session: rejectScenarioAction(session, reason, trainId, source),
        }
      }
    } else if (action.type !== 'SELECT_TRAIN') {
      const reason = 'Select a train first for this assessment action.'

      return {
        accepted: false,
        reason,
        session: rejectScenarioAction(session, reason, trainId, source),
      }
    }

    if (action.type === 'SELECT_TRAIN') {
      return applyTrainSelection(session, action, {
        activeScenarioId,
        applyAcceptedTask,
        source,
        trainId,
      })
    }

    if (action.type === 'ACK_ALARM') {
      const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'ackAlarm', activeScenarioId, targetTrainId)

      if (blocker) {
        return {
          accepted: false,
          reason: blocker,
          session: rejectScenarioAction(session, blocker, trainId, source),
        }
      }

      return {
        accepted: true,
        session: {
          ...applyAcceptedTask(
            session,
            'ackAlarm',
            source,
            action.detail ?? 'Alarm acknowledgement accepted.',
          ),
          alarmSummaryRows: (session.alarmSummaryRows ?? []).map((row) => ({
            ...row,
            ack: 'N',
            tone: row.tone === 'red' ? 'red' : 'grey',
            value: row.value === 'NO ACK' ? 'ACK' : row.value,
          })),
        },
      }
    }

    if (action.type === 'SET_ROUTE' || action.type === 'DISPATCH_TRAIN') {
      const taskId = action.type === 'DISPATCH_TRAIN' ? 'dispatchTrain' : 'setRoute'
      const nextStatus = action.type === 'DISPATCH_TRAIN' ? 'RUN' : 'WAIT'
      const timetableState = action.type === 'DISPATCH_TRAIN' ? '>' : 'R'
      const message = action.type === 'DISPATCH_TRAIN'
        ? `Train ${trainId}: Dispatch command executed`
        : `Train ${trainId}: Route command selected`
      const blocker = getScenarioTaskBlocker(session.scenarioTasks, taskId, activeScenarioId, targetTrainId)

      if (blocker) {
        return {
          accepted: false,
          reason: blocker,
          session: rejectScenarioAction(session, blocker, trainId, source),
        }
      }

      const event = createMonitorEvent(trainId, message, nextStatus, 'yellow')
      const acceptedSession = applyAcceptedTask(
        session,
        taskId,
        source,
        action.detail ?? `${message} accepted.`,
      )

      return {
        accepted: true,
        session: {
          ...acceptedSession,
          alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
          eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
          selectedTrainId: trainId,
          lineMap: updateLineMapRouteState(
            session.lineMap,
            trainId,
            action.type === 'DISPATCH_TRAIN' ? 'DISPATCHED' : 'SET',
          ),
          timetableRows: (session.timetableRows ?? []).map((row) => (
            row.train === trainId ? { ...row, state: timetableState } : row
          )),
          trains: (session.trains ?? []).map((train) => (
            train.id === trainId ? { ...train, status: nextStatus } : train
          )),
        },
      }
    }

    if (action.type === 'COMPLETE_SCENARIO') {
      const blocker = getScenarioTaskBlocker(session.scenarioTasks, 'completeScenario', activeScenarioId, targetTrainId)

      if (blocker) {
        return {
          accepted: false,
          reason: blocker,
          session: rejectScenarioAction(session, blocker, trainId, source),
        }
      }

      const event = createMonitorEvent(trainId, `Scenario complete: Trainer reviewed Train ${trainId} response`, 'COMPLETE', 'yellow')
      const acceptedSession = applyAcceptedTask(
        session,
        'completeScenario',
        source,
        action.detail ?? 'Scenario review complete. Report is ready.',
      )

      return {
        accepted: true,
        session: {
          ...acceptedSession,
          alarmSummaryRows: [createSummaryEvent(event), ...(session.alarmSummaryRows ?? [])].slice(0, 12),
          eventRows: [event, ...(session.eventRows ?? [])].slice(0, 4),
        },
      }
    }

    return {
      accepted: false,
      reason: `Unsupported backend action: ${action.type ?? 'UNKNOWN'}`,
      session,
    }
  }
}

function getTargetTrainId(session, activeScenarioId) {
  if (activeScenarioId === 'train-withdrawal' || activeScenarioId === 'train-launch') {
    return session?.activeScenario?.targetTrainId ?? ''
  }

  return '317'
}

function applyTrainSelection(session, action, {
  activeScenarioId,
  applyAcceptedTask,
  source,
  trainId,
}) {
  const detail = action.detail ?? getTrainSelectionDetail(activeScenarioId, trainId)
  const updatedSession = applyAcceptedTask(
    session,
    'selectTrain',
    source,
    detail,
  )

  if (
    (activeScenarioId === 'train-withdrawal' || activeScenarioId === 'train-launch')
    && !session?.activeScenario?.targetTrainId
  ) {
    updatedSession.activeScenario = {
      ...session.activeScenario,
      targetTrainId: trainId,
    }
    updatedSession.trains = (session.trains ?? []).map((train) => (
      train.id === trainId
        ? {
            ...train,
            lineMapVisible: true,
            timetablePlayback: false,
            ...(activeScenarioId === 'train-launch' ? {
              ...RT1_LAUNCH_STAGING_STEP,
              direction: 'right',
              isMoving: false,
              service: 'NB',
              status: 'WAIT',
            } : {}),
          }
        : train
    ))
  }

  return {
    accepted: true,
    session: {
      ...updatedSession,
      selectedTrainId: trainId,
    },
  }
}

function getTrainSelectionDetail(activeScenarioId, trainId) {
  if (activeScenarioId === 'train-withdrawal') {
    return `Train ${trainId} selected for withdrawal.`
  }

  if (activeScenarioId === 'train-launch') {
    return `Train ${trainId} selected for launch.`
  }

  return `Train ${trainId} selected. Acknowledge alarm before route.`
}
