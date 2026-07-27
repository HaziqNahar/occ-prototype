import type { TrainState } from '../../types'
import type { TimetablePlaybackPlan } from './timetablePlayback'
import {
  SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX,
} from './trainMovementRoutes'

export const RT1_LAUNCH_ROUTE_LABEL = 'Route R655_617'
export const SKG_NORTHBOUND_PLATFORM_RAIL_ID = 'rail-617'

export function shouldResumeTimetableAfterManualLaunch(
  train: TrainState | undefined,
  plan: TimetablePlaybackPlan,
) {
  return Boolean(
    train?.lineMapVisible
    && train.timetablePlayback
    && train.occupancySegmentId === SKG_NORTHBOUND_PLATFORM_RAIL_ID
    && plan.service === 'NB'
    && plan.signalRouteRefs.includes(RT1_LAUNCH_ROUTE_LABEL)
    && plan.platformStops.some((stop) => (
      stop.platformCode === 'SKG'
      && stop.track === 'NB'
      && stop.stepIndex === SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX
    )),
  )
}

export function createManualLaunchTimetableHandoffPlan(plan: TimetablePlaybackPlan): TimetablePlaybackPlan {
  return {
    ...plan,
    firstStepIndex: Math.max(plan.firstStepIndex, SKG_TIMETABLE_LAUNCH_PLATFORM_STEP_INDEX),
    skipDepotLaunchLeadIn: true,
  }
}
