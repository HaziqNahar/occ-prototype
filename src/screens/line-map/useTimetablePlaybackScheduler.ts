import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createTimetableClockKey,
  getTimetableClockNow,
  scaleTimetablePlaybackPlansForClock,
} from '../../timetableClockState'
import type { OccSessionState, RouteControlMode } from '../../types'
import {
  TIMETABLE_PLAYBACK_REFRESH_MS,
} from './timetablePlayback'
import {
  createManualLaunchTimetableHandoffPlan,
  shouldResumeTimetableAfterManualLaunch,
} from './timetableLaunchHandoff'
import {
  applyTimetablePlaybackRunStart,
  createAutomaticTimetableMovementAuthorities,
  createTimetablePlaybackPlanKey,
  createTimetablePlaybackScopeKey,
  filterTimetableRowsForAutomaticMovement,
  getActiveTimetableMovementAuthorityTrainIds,
  pruneInactiveTimetablePlaybackPlanSchedules,
  scheduleTimetablePlaybackPlans,
} from './timetablePlaybackController'
import type { TimetablePlaybackSessionUpdater } from './timetablePlaybackController'

type TimetablePlaybackSchedulerOptions = {
  blockedTrainIds: ReadonlySet<string>
  cancelTrainRouteAnimation: () => void
  routeControlModes: Record<string, RouteControlMode>
  session: OccSessionState
  updateSession: TimetablePlaybackSessionUpdater
}

export default function useTimetablePlaybackScheduler({
  blockedTrainIds,
  cancelTrainRouteAnimation,
  routeControlModes,
  session,
  updateSession,
}: TimetablePlaybackSchedulerOptions) {
  const [playbackTick, setPlaybackTick] = useState(0)
  const [diagnosticsNow, setDiagnosticsNow] = useState(() => new Date())
  const planTimeoutsRef = useRef(new Map<string, number[]>())
  const scheduledPlanKeysRef = useRef(new Set<string>())
  const scopeKeyRef = useRef('')
  const latestSessionRef = useRef(session)
  const timetableRowsRef = useRef(session.timetableRows)

  useEffect(() => {
    latestSessionRef.current = session
  }, [session])

  useEffect(() => {
    timetableRowsRef.current = session.timetableRows
  }, [session.timetableRows])

  const cancelPlayback = useCallback(() => {
    planTimeoutsRef.current.forEach((timeoutIds) => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    })
    planTimeoutsRef.current.clear()
    scheduledPlanKeysRef.current.clear()
    scopeKeyRef.current = ''
  }, [])

  useEffect(() => () => cancelPlayback(), [cancelPlayback])

  useEffect(() => {
    if (session.scenarioMode !== 'IDLE' || session.scenarioStep !== 0) {
      return
    }

    cancelTrainRouteAnimation()
    cancelPlayback()
  }, [cancelPlayback, cancelTrainRouteAnimation, session.scenarioMode, session.scenarioStep])

  useEffect(() => {
    const refreshMs = session.timetableClock.mode === 'PLAYBACK'
      ? 1000
      : TIMETABLE_PLAYBACK_REFRESH_MS
    const intervalId = window.setInterval(() => {
      setPlaybackTick((current) => current + 1)
      setDiagnosticsNow(new Date())
    }, refreshMs)

    return () => window.clearInterval(intervalId)
  }, [session.timetableClock.mode])

  useEffect(() => {
    const playbackClock = latestSessionRef.current.timetableClock
    const playbackNow = getTimetableClockNow(playbackClock, new Date())
    const scopeKey = [
      createTimetablePlaybackScopeKey(
        session.sessionMeta.createdAt,
        routeControlModes,
      ),
      createTimetableClockKey(playbackClock),
    ].join(':')

    if (scopeKeyRef.current !== scopeKey) {
      cancelPlayback()
      scopeKeyRef.current = scopeKey
    }

    const timetableRowsForAutomaticMovement = filterTimetableRowsForAutomaticMovement(
      timetableRowsRef.current,
      blockedTrainIds,
    )
    const movementAuthorities = createAutomaticTimetableMovementAuthorities(
      latestSessionRef.current,
      routeControlModes,
      playbackNow,
      timetableRowsForAutomaticMovement,
    )
    const playbackPlans = scaleTimetablePlaybackPlansForClock(
      movementAuthorities
        .filter((authority) => authority.allowed)
        .map((authority) => authority.plan),
      playbackClock,
    ).map((playbackPlan) => {
      const train = latestSessionRef.current.trains.find((candidate) => (
        candidate.id === playbackPlan.trainId
      ))

      return shouldResumeTimetableAfterManualLaunch(train, playbackPlan)
        ? createManualLaunchTimetableHandoffPlan(playbackPlan)
        : playbackPlan
    })
    const activePlanKeys = new Set(playbackPlans.map(createTimetablePlaybackPlanKey))

    pruneInactiveTimetablePlaybackPlanSchedules({
      activePlanKeys,
      clearTimeout: (timeoutId) => window.clearTimeout(timeoutId),
      planTimeouts: planTimeoutsRef.current,
      scheduledPlanKeys: scheduledPlanKeysRef.current,
    })

    const scheduledTrainIds = new Set<string>()
    scheduledPlanKeysRef.current.forEach((planKey) => {
      const [trainId] = planKey.split('|')

      if (trainId) {
        scheduledTrainIds.add(trainId)
      }
    })
    const activeTrainIds = new Set([
      ...getActiveTimetableMovementAuthorityTrainIds(movementAuthorities),
      ...scheduledTrainIds,
      ...blockedTrainIds,
    ])
    const heldTrainIds = new Set(
      movementAuthorities
        .filter((authority) => !authority.allowed)
        .map((authority) => authority.trainId),
    )

    updateSession((current) => applyTimetablePlaybackRunStart(
      current,
      playbackPlans,
      activeTrainIds,
      heldTrainIds,
    ))

    playbackPlans.forEach((plan) => {
      const planKey = createTimetablePlaybackPlanKey(plan)

      if (scheduledPlanKeysRef.current.has(planKey)) {
        return
      }

      const timeoutIds = scheduleTimetablePlaybackPlans({
        plans: [plan],
        scheduleTimeout: (callback, delayMs) => {
          let timeoutId = 0

          timeoutId = window.setTimeout(() => {
            try {
              callback()
            } finally {
              const currentTimeoutIds = planTimeoutsRef.current.get(planKey) ?? []
              const remainingTimeoutIds = currentTimeoutIds.filter((currentTimeoutId) => currentTimeoutId !== timeoutId)

              if (remainingTimeoutIds.length > 0) {
                planTimeoutsRef.current.set(planKey, remainingTimeoutIds)
              } else {
                planTimeoutsRef.current.delete(planKey)
              }
            }
          }, delayMs)

          return timeoutId
        },
        updateSession,
      })

      scheduledPlanKeysRef.current.add(planKey)
      planTimeoutsRef.current.set(planKey, timeoutIds)
    })
  }, [
    blockedTrainIds,
    cancelPlayback,
    playbackTick,
    routeControlModes,
    session.sessionMeta.createdAt,
    session.timetableClock,
    updateSession,
  ])

  return diagnosticsNow
}
