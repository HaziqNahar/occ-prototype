import type {
  LineMapRouteSegmentState,
  LineMapRouteSegmentStatus,
  LineMapRuntimeState,
} from '../../types'

type LineMapRouteSegmentStateOptions = {
  trainId?: string
  updatedAt?: number
}

export function createLineMapRouteSegmentState(
  segmentId: string,
  status: LineMapRouteSegmentStatus,
  options: LineMapRouteSegmentStateOptions = {},
): LineMapRouteSegmentState {
  return {
    segmentId,
    status,
    trainId: options.trainId ?? '',
    updatedAt: options.updatedAt ?? Date.now(),
  }
}

export function createLineMapRouteSegmentStates(
  segmentIds: readonly string[],
  status: LineMapRouteSegmentStatus,
  options: LineMapRouteSegmentStateOptions = {},
): LineMapRuntimeState['routeSegments'] {
  const updatedAt = options.updatedAt ?? Date.now()
  const routeSegments: LineMapRuntimeState['routeSegments'] = {}

  setLineMapRouteSegmentStates(routeSegments, segmentIds, status, {
    ...options,
    updatedAt,
  })

  return routeSegments
}

export function setLineMapRouteSegmentState(
  routeSegments: LineMapRuntimeState['routeSegments'],
  segmentId: string,
  status: LineMapRouteSegmentStatus,
  options: LineMapRouteSegmentStateOptions = {},
) {
  routeSegments[segmentId] = createLineMapRouteSegmentState(segmentId, status, options)
}

export function setLineMapRouteSegmentStates(
  routeSegments: LineMapRuntimeState['routeSegments'],
  segmentIds: readonly string[],
  status: LineMapRouteSegmentStatus,
  options: LineMapRouteSegmentStateOptions = {},
) {
  const updatedAt = options.updatedAt ?? Date.now()

  segmentIds.forEach((segmentId) => {
    setLineMapRouteSegmentState(routeSegments, segmentId, status, {
      ...options,
      updatedAt,
    })
  })
}

export function clearLineMapRouteSegmentState(
  routeSegments: LineMapRuntimeState['routeSegments'],
  segmentId: string,
) {
  delete routeSegments[segmentId]
}

export function clearLineMapRouteSegmentStates(
  routeSegments: LineMapRuntimeState['routeSegments'],
  segmentIds: readonly string[],
) {
  segmentIds.forEach((segmentId) => {
    clearLineMapRouteSegmentState(routeSegments, segmentId)
  })
}
