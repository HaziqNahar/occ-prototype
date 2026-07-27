export type ManualTrainRoutePlaybackPlan = {
  currentStepIndex: number
  lastStepIndex: number
  onComplete?: () => void
  onStep: (stepIndex: number) => void
  stepDurationMs: number
  trainId: string
}

type ManualTrainRoutePlaybackTimer = {
  clearTimeout: (timeoutId: number) => void
  scheduleTimeout: (callback: () => void, delayMs: number) => number
}

export type ManualTrainRoutePlaybackController = {
  cancel: (trainId: string) => boolean
  cancelAll: () => void
  getActiveTrainIds: () => string[]
  start: (plan: ManualTrainRoutePlaybackPlan) => boolean
}

export function createManualTrainRoutePlaybackController({
  clearTimeout,
  scheduleTimeout,
}: ManualTrainRoutePlaybackTimer): ManualTrainRoutePlaybackController {
  const timeoutByTrainId = new Map<string, number>()

  const cancel = (trainId: string) => {
    const timeoutId = timeoutByTrainId.get(trainId)

    if (timeoutId === undefined) {
      return false
    }

    clearTimeout(timeoutId)
    timeoutByTrainId.delete(trainId)
    return true
  }

  const cancelAll = () => {
    timeoutByTrainId.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutByTrainId.clear()
  }

  const start = (plan: ManualTrainRoutePlaybackPlan) => {
    cancel(plan.trainId)

    if (plan.currentStepIndex >= plan.lastStepIndex) {
      return false
    }

    const scheduleStep = (stepIndex: number) => {
      let timeoutId = 0

      timeoutId = scheduleTimeout(() => {
        if (timeoutByTrainId.get(plan.trainId) !== timeoutId) {
          return
        }

        timeoutByTrainId.delete(plan.trainId)
        plan.onStep(stepIndex)

        if (stepIndex < plan.lastStepIndex) {
          scheduleStep(stepIndex + 1)
        } else {
          plan.onComplete?.()
        }
      }, plan.stepDurationMs)

      timeoutByTrainId.set(plan.trainId, timeoutId)
    }

    scheduleStep(plan.currentStepIndex + 1)
    return true
  }

  return {
    cancel,
    cancelAll,
    getActiveTrainIds: () => [...timeoutByTrainId.keys()],
    start,
  }
}
