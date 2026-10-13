import type { OccSessionState, RouteControlMode, TimetableRow } from '../../types'
import { upsertTimetableRow } from '../../scenarioWorkflow'
import type { SimScenarioEvent } from '../../session-commands/types'
import { clearInactiveTimetablePlaybackTrains } from '../../sessionState'
import {
  applyTrainingScenarioTimetableCompletion,
  applyTrainingScenarioTimetableStep,
  getTrainingScenarioDefinition,
} from '../../trainingScenarios'
import {
  applyTimetablePlaybackStepState,
  completeTimetablePlaybackStepState,
} from './trainMovementState'
import type { TimetablePlaybackPlan } from './timetablePlayback'
import {
  createAllowedTimetablePlaybackPlans,
  createTimetableMovementAuthorities,
} from './timetableMovementAuthority'
import type { TimetableMovementAuthority } from './timetableMovementAuthority'
import {
  getTrainReadinessMode,
  isTrainItamaGranted,
} from './model'
import { createTimetablePlaybackSchedule } from './timetablePlaybackScheduler'
import type {
  TimetablePlaybackScheduleEntry,
  TimetablePlaybackScheduler,
} from './timetablePlaybackScheduler'
import {
  setLineMapPlatformDoorState,
} from './platformDoorState'
import type { TimetablePlatformDoorPhase } from './platformDoorState'
import { getTimetablePlatformStopForStep } from './timetablePlatformStops'

// Applies simulation output to the session. The optional events carry launch
// progress of the scenario train, which the server scores.
export type TimetablePlaybackSessionUpdater = (
  updater: (current: OccSessionState) => OccSessionState,
  getEvents?: (current: OccSessionState) => SimScenarioEvent[],
) => void

// Scenario progress for the scheduled step, only for a Train Launch's own train.
export function getTimetablePlaybackScenarioEvents(
  current: OccSessionState,
  entry: TimetablePlaybackScheduleEntry,
): SimScenarioEvent[] {
  if (
    entry.platformDoorPhase
    || entry.plan.trainId !== current.activeScenario.targetTrainId
    || getTrainingScenarioDefinition(current.activeScenario.id).kind !== 'TRAIN_LAUNCH'
  ) {
    return []
  }

  return entry.completeRoute
    ? [{ plan: entry.plan, type: 'TIMETABLE_COMPLETE' }]
    : [{ plan: entry.plan, stepIndex: entry.stepIndex, type: 'TIMETABLE_STEP' }]
}

export function createTimetablePlaybackRouteModeKey(routeControlModes: Record<string, RouteControlMode>) {
  return Object.entries(routeControlModes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([panelCode, mode]) => `${panelCode}:${mode}`)
    .join('|')
}

export function createTimetablePlaybackRunKey(
  sessionCreatedAt: string,
  routeControlModes: Record<string, RouteControlMode>,
  playbackTick: number,
  timetableViewKey = '',
) {
  const baseKey = `${createTimetablePlaybackScopeKey(sessionCreatedAt, routeControlModes)}:${playbackTick}`

  return timetableViewKey ? `${baseKey}:${timetableViewKey}` : baseKey
}

export function createTimetablePlaybackScopeKey(
  sessionCreatedAt: string,
  routeControlModes: Record<string, RouteControlMode>,
) {
  return `${sessionCreatedAt}:${createTimetablePlaybackRouteModeKey(routeControlModes)}`
}

export function createTimetablePlaybackPlanKey(plan: Pick<
  TimetablePlaybackPlan,
  'endSeconds' | 'scheduleNumber' | 'startSeconds' | 'stationRouteId' | 'trainId'
>) {
  return [
    plan.trainId,
    plan.scheduleNumber,
    plan.stationRouteId,
    plan.startSeconds,
    plan.endSeconds,
  ].join('|')
}

export function createAutomaticTimetablePlaybackPlans(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
  rows: readonly TimetableRow[] = session.timetableRows,
) {
  return createAllowedTimetablePlaybackPlans(session, routeControlModes, now, rows)
}

export function createAutomaticTimetableMovementAuthorities(
  session: OccSessionState,
  routeControlModes: Record<string, RouteControlMode>,
  now: Date,
  rows: readonly TimetableRow[] = session.timetableRows,
) {
  return createTimetableMovementAuthorities(session, routeControlModes, now, rows)
}

export function getActiveTimetablePlaybackTrainIds(plans: readonly TimetablePlaybackPlan[]) {
  return new Set(plans.map((plan) => plan.trainId))
}

export function filterTimetableRowsForAutomaticMovement(
  rows: readonly TimetableRow[],
  blockedTrainIds: ReadonlySet<string>,
) {
  if (blockedTrainIds.size === 0) {
    return rows
  }

  return rows.filter((row) => !blockedTrainIds.has(row.train))
}

export function getActiveTimetableMovementAuthorityTrainIds(authorities: readonly TimetableMovementAuthority[]) {
  return new Set(authorities.map((authority) => authority.trainId))
}

// A trip's last steps run after its timetable end (platform stops add dwell),
// so a trip that is still under way keeps its remaining steps: otherwise the
// train freezes short of the platform and never leaves the map.
export function pruneInactiveTimetablePlaybackPlanSchedules({
  activePlanKeys,
  clearTimeout,
  isTripUnderway = () => false,
  planTimeouts,
  scheduledPlanKeys,
}: {
  activePlanKeys: ReadonlySet<string>
  clearTimeout: (timeoutId: number) => void
  isTripUnderway?: (trainId: string) => boolean
  planTimeouts: Map<string, number[]>
  scheduledPlanKeys: Set<string>
}) {
  scheduledPlanKeys.forEach((planKey) => {
    if (activePlanKeys.has(planKey)) {
      return
    }

    const [trainId = ''] = planKey.split('|')

    if ((planTimeouts.get(planKey)?.length ?? 0) > 0 && isTripUnderway(trainId)) {
      return
    }

    const timeoutIds = planTimeouts.get(planKey) ?? []

    timeoutIds.forEach(clearTimeout)
    planTimeouts.delete(planKey)
    scheduledPlanKeys.delete(planKey)
  })
}

export function applyTimetablePlaybackRunStart(
  current: OccSessionState,
  plans: readonly TimetablePlaybackPlan[],
  activeTrainIds: ReadonlySet<string> = getActiveTimetablePlaybackTrainIds(plans),
  heldTrainIds: ReadonlySet<string> = new Set(),
): OccSessionState {
  const cleaned = clearInactiveTimetablePlaybackTrains(current, activeTrainIds)

  if (heldTrainIds.size === 0) {
    return cleaned
  }

  const lineMap = clearHeldTimetableTrainRouteState(cleaned.lineMap, heldTrainIds)

  return {
    ...cleaned,
    lineMap,
    trains: cleaned.trains.map((train) => (
      heldTrainIds.has(train.id) && train.timetablePlayback
        ? {
            ...train,
            isMoving: false,
            status: 'WAIT' as const,
          }
        : train
    )),
  }
}

function clearHeldTimetableTrainRouteState(
  lineMap: OccSessionState['lineMap'],
  trainIds: ReadonlySet<string>,
): OccSessionState['lineMap'] {
  const routeSegments = { ...lineMap.routeSegments }
  let changed = false

  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (!trainIds.has(state.trainId)) {
      return
    }

    delete routeSegments[segmentId]
    changed = true
  })

  return changed
    ? {
        ...lineMap,
        routeSegments,
      }
    : lineMap
}

export function applyTimetablePlaybackStepSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const step = plan.steps[stepIndex]

  if (!step) {
    return current
  }

  const platformStop = getTimetablePlatformStopForStep(plan, stepIndex)
  const lastStepIndex = plan.steps.length - 1
  const next = applyTimetablePlaybackStepState(current, plan, step, stepIndex, lastStepIndex, Boolean(platformStop))
  const scenarioNext = applyTrainingScenarioTimetableStep(next, plan, stepIndex)

  // Routine timetable running is not an alarm on the OCC GWS, so it stays out of
  // the alarm list, the event strip and the IOS notice.
  return {
    ...scenarioNext,
    timetableRows: upsertTimetableRow(scenarioNext.timetableRows, plan.trainId, '>'),
  }
}

export function applyTimetablePlatformDoorPhaseSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
  phase: TimetablePlatformDoorPhase,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const platformStop = getTimetablePlatformStopForStep(plan, stepIndex)

  if (!platformStop) {
    return current
  }

  return {
    ...current,
    lineMap: setLineMapPlatformDoorState(current.lineMap, platformStop, phase, plan.trainId),
  }
}

export function applyTimetablePlaybackCompletionSession(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
): OccSessionState {
  const blocked = holdTimetablePlaybackTrainIfMovementBlocked(current, plan.trainId)

  if (blocked) {
    return blocked
  }

  const completed = completeTimetablePlaybackStepState(current, plan)
  const scenarioNext = applyTrainingScenarioTimetableCompletion(completed, plan)

  return {
    ...scenarioNext,
    timetableRows: upsertTimetableRow(scenarioNext.timetableRows, plan.trainId, '>'),
  }
}

export function applyTimetablePlaybackScheduleEntrySession(
  current: OccSessionState,
  entry: TimetablePlaybackScheduleEntry,
): OccSessionState {
  if (entry.completeRoute) {
    return applyTimetablePlaybackCompletionSession(current, entry.plan)
  }

  if (entry.platformDoorPhase) {
    return applyTimetablePlatformDoorPhaseSession(current, entry.plan, entry.stepIndex, entry.platformDoorPhase)
  }

  return applyTimetablePlaybackStepSession(current, entry.plan, entry.stepIndex)
}

function holdTimetablePlaybackTrainIfMovementBlocked(
  current: OccSessionState,
  trainId: string,
): OccSessionState | null {
  const train = current.trains.find((candidate) => candidate.id === trainId)

  if (!train || !isTimetableTrainMovementBlocked(train)) {
    return null
  }

  return {
    ...current,
    trains: current.trains.map((candidate) => (
      candidate.id === trainId
        ? {
            ...candidate,
            isMoving: false,
            status: 'WAIT' as const,
          }
        : candidate
    )),
  }
}

function isTimetableTrainMovementBlocked(train: OccSessionState['trains'][number]) {
  return getTrainReadinessMode(train) !== 'MAINLINE_SERVICE'
    || !isTrainItamaGranted(train)
}

export function scheduleTimetablePlaybackRun({
  now,
  routeControlModes,
  rows,
  scheduleTimeout,
  session,
  updateSession,
}: {
  now: Date
  routeControlModes: Record<string, RouteControlMode>
  rows?: readonly TimetableRow[]
  scheduleTimeout: TimetablePlaybackScheduler
  session: OccSessionState
  updateSession: TimetablePlaybackSessionUpdater
}) {
  const playbackPlans = createAutomaticTimetablePlaybackPlans(session, routeControlModes, now, rows)

  updateSession((current) => applyTimetablePlaybackRunStart(current, playbackPlans))

  return scheduleTimetablePlaybackPlans({
    plans: playbackPlans,
    scheduleTimeout,
    updateSession,
  })
}

// One train per block: a timetable train does not move onto a step where
// another train already stands (a held train, or the train ahead waiting).
// Steps are about 35 px apart, so the follower waits one step behind.
const TIMETABLE_BLOCK_RADIUS = 25
const TIMETABLE_LANE_RADIUS = 100
export const TIMETABLE_BLOCKED_RETRY_MS = 2000

export function isTimetableStepBlockedByTrainAhead(
  current: OccSessionState,
  plan: TimetablePlaybackPlan,
  stepIndex: number,
) {
  const step = plan.steps[stepIndex]

  return Boolean(step && current.trains.some((train) => (
    train.id !== plan.trainId
    && train.lineMapVisible === true
    && Math.abs(train.x - step.point.x) <= TIMETABLE_BLOCK_RADIUS
    && Math.abs(train.y - step.point.y) <= TIMETABLE_LANE_RADIUS
  )))
}

function waitForBlockAhead(current: OccSessionState, trainId: string): OccSessionState {
  return {
    ...current,
    trains: current.trains.map((train) => (
      train.id === trainId && (train.isMoving || train.status !== 'WAIT')
        ? { ...train, isMoving: false, status: 'WAIT' as const }
        : train
    )),
  }
}

// Each trip's steps run in order. A step whose block is occupied waits and
// tries again, and the rest of the trip runs that much later, so following
// trains queue one block apart and run late, as on the real line.
export function scheduleTimetablePlaybackPlans({
  now = () => Date.now(),
  plans,
  scheduleTimeout,
  updateSession,
}: {
  now?: () => number
  plans: readonly TimetablePlaybackPlan[]
  scheduleTimeout: TimetablePlaybackScheduler
  updateSession: TimetablePlaybackSessionUpdater
}) {
  const startedAt = now()

  return plans.flatMap((plan) => {
    const entries = createTimetablePlaybackSchedule([plan])
      .map((entry, order) => ({ entry, order }))
      .sort((left, right) => left.entry.delayMs - right.entry.delayMs || left.order - right.order)
      .map(({ entry }) => entry)
    let lateMs = 0

    const scheduleEntry = (index: number): number | undefined => {
      const entry = entries[index]

      if (!entry) {
        return undefined
      }

      return scheduleTimeout(() => {
        let blocked = false

        updateSession(
          (current) => {
            const isStep = !entry.completeRoute && !entry.platformDoorPhase

            if (isStep && isTimetableStepBlockedByTrainAhead(current, entry.plan, entry.stepIndex)) {
              blocked = true

              return waitForBlockAhead(current, entry.plan.trainId)
            }

            return applyTimetablePlaybackScheduleEntrySession(current, entry)
          },
          (current) => (blocked ? [] : getTimetablePlaybackScenarioEvents(current, entry)),
        )

        if (blocked) {
          lateMs = Math.max(lateMs, now() - startedAt - entry.delayMs) + TIMETABLE_BLOCKED_RETRY_MS
          scheduleEntry(index)
          return
        }

        scheduleEntry(index + 1)
      }, Math.max(0, startedAt + entry.delayMs + lateMs - now()))
    }

    const firstTimeoutId = scheduleEntry(0)

    return firstTimeoutId === undefined ? [] : [firstTimeoutId]
  })
}
