import { useCallback, useEffect, useRef } from 'react'
import {
  createManualTrainRoutePlaybackController,
} from './manualTrainRoutePlaybackController'
import type {
  ManualTrainRoutePlaybackPlan,
} from './manualTrainRoutePlaybackController'

export default function useManualTrainRoutePlayback() {
  const controllerRef = useRef<ReturnType<typeof createManualTrainRoutePlaybackController> | null>(null)

  if (controllerRef.current === null) {
    controllerRef.current = createManualTrainRoutePlaybackController({
      clearTimeout: (timeoutId) => window.clearTimeout(timeoutId),
      scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    })
  }

  const cancel = useCallback((trainId: string) => {
    return controllerRef.current?.cancel(trainId) ?? false
  }, [])
  const cancelAll = useCallback(() => {
    controllerRef.current?.cancelAll()
  }, [])
  const start = useCallback((plan: ManualTrainRoutePlaybackPlan) => {
    return controllerRef.current?.start(plan) ?? false
  }, [])

  useEffect(() => () => cancelAll(), [cancelAll])

  return {
    cancel,
    cancelAll,
    start,
  }
}
