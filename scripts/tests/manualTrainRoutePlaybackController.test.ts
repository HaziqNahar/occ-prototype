import assert from 'node:assert/strict'
import {
  createManualTrainRoutePlaybackController,
} from '../../src/screens/line-map/manualTrainRoutePlaybackController'

function createTimerHarness() {
  let nextTimeoutId = 1
  const callbacks = new Map<number, () => void>()
  const clearedTimeoutIds: number[] = []

  return {
    callbacks,
    clearedTimeoutIds,
    clearTimeout(timeoutId: number) {
      clearedTimeoutIds.push(timeoutId)
      callbacks.delete(timeoutId)
    },
    run(timeoutId: number) {
      const callback = callbacks.get(timeoutId)

      assert.ok(callback, `Expected timeout ${timeoutId} to be scheduled.`)
      callbacks.delete(timeoutId)
      callback()
    },
    scheduleTimeout(callback: () => void) {
      const timeoutId = nextTimeoutId
      nextTimeoutId += 1
      callbacks.set(timeoutId, callback)
      return timeoutId
    },
  }
}

{
  const timer = createTimerHarness()
  const controller = createManualTrainRoutePlaybackController(timer)
  const steps: string[] = []

  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 2,
    onComplete: () => steps.push('301-complete'),
    onStep: (stepIndex) => steps.push(`301-${stepIndex}`),
    stepDurationMs: 100,
    trainId: '301',
  })
  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 1,
    onComplete: () => steps.push('312-complete'),
    onStep: (stepIndex) => steps.push(`312-${stepIndex}`),
    stepDurationMs: 100,
    trainId: '312',
  })

  assert.deepEqual(controller.getActiveTrainIds().sort(), ['301', '312'])
  timer.run(1)
  assert.deepEqual(controller.getActiveTrainIds().sort(), ['301', '312'])
  timer.run(2)
  assert.deepEqual(controller.getActiveTrainIds(), ['301'])
  timer.run(3)
  assert.deepEqual(controller.getActiveTrainIds(), [])
  assert.deepEqual(steps, ['301-1', '312-1', '312-complete', '301-2', '301-complete'])
}

{
  const timer = createTimerHarness()
  const controller = createManualTrainRoutePlaybackController(timer)
  const steps: number[] = []

  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 1,
    onStep: (stepIndex) => steps.push(stepIndex),
    stepDurationMs: 100,
    trainId: '301',
  })
  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 1,
    onStep: (stepIndex) => steps.push(stepIndex + 10),
    stepDurationMs: 100,
    trainId: '301',
  })

  assert.deepEqual(timer.clearedTimeoutIds, [1])
  assert.deepEqual([...timer.callbacks.keys()], [2])
  timer.run(2)
  assert.deepEqual(steps, [11])
}

{
  const timer = createTimerHarness()
  const controller = createManualTrainRoutePlaybackController(timer)

  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 1,
    onStep: () => undefined,
    stepDurationMs: 100,
    trainId: '301',
  })
  controller.start({
    currentStepIndex: 0,
    lastStepIndex: 1,
    onStep: () => undefined,
    stepDurationMs: 100,
    trainId: '312',
  })
  controller.cancelAll()

  assert.deepEqual(timer.clearedTimeoutIds, [1, 2])
  assert.deepEqual(controller.getActiveTrainIds(), [])
  assert.equal(timer.callbacks.size, 0)
}
