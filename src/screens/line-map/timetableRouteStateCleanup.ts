import type { LineMapRuntimeState } from '../../types'
import { clearLineMapRouteSegmentState } from './lineMapRouteSegmentState'

export function isTimetableIneligibleGuideRailId(segmentId: string) {
  return segmentId.startsWith('rail-P')
    || segmentId === 'rail-1115'
    || segmentId.endsWith('-background')
}

export function clearTimetableGuideRouteState(
  lineMap: LineMapRuntimeState,
  timetableTrainIds: ReadonlySet<string>,
): LineMapRuntimeState {
  if (timetableTrainIds.size === 0) {
    return lineMap
  }

  let changed = false
  const routeSegments = { ...lineMap.routeSegments }

  Object.entries(routeSegments).forEach(([segmentId, state]) => {
    if (!timetableTrainIds.has(state.trainId) || !isTimetableIneligibleGuideRailId(segmentId)) {
      return
    }

    clearLineMapRouteSegmentState(routeSegments, segmentId)
    changed = true
  })

  return changed
    ? {
        ...lineMap,
        routeSegments,
      }
    : lineMap
}
