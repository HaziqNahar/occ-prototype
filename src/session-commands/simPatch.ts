import { upsertTimetableRow } from '../scenarioWorkflow'
import { normalizeLineMapRuntimeState } from '../screens/line-map/lineMapRuntimeState'
import type { OccSessionState, TrainState } from '../types'
import type { SimKeyedPatch, SimPatch, SimTrainPatch } from './types'

// The Line Map window runs the train simulation and reports what moved as a
// SimPatch. Only the fields listed here can travel in a patch; everything that
// is scored (tasks, evidence, door faults, ITAMA, holds by command) cannot.

const SIM_TRAIN_FIELDS = [
  'direction',
  'isMoving',
  'lineMapVisible',
  'occupancySegmentId',
  'scheduleNumber',
  'service',
  'status',
  'timetablePlayback',
  'trainNumber',
  'x',
  'y',
] as const satisfies ReadonlyArray<keyof TrainState>

type SimTrainField = (typeof SIM_TRAIN_FIELDS)[number]

function diffKeyed<T>(before: Record<string, T>, after: Record<string, T>): SimKeyedPatch<T> | undefined {
  const set: Record<string, T> = {}
  const remove: string[] = []

  Object.entries(after).forEach(([key, value]) => {
    if (before[key] !== value && JSON.stringify(before[key]) !== JSON.stringify(value)) {
      set[key] = value
    }
  })
  Object.keys(before).forEach((key) => {
    if (!(key in after)) {
      remove.push(key)
    }
  })

  if (Object.keys(set).length === 0 && remove.length === 0) {
    return undefined
  }

  return {
    ...(Object.keys(set).length > 0 ? { set } : {}),
    ...(remove.length > 0 ? { remove } : {}),
  }
}

function diffTrain(before: TrainState | undefined, after: TrainState): SimTrainPatch | undefined {
  if (before === after) {
    return undefined
  }

  const patch: SimTrainPatch = { id: after.id }
  const cleared: SimTrainPatch['cleared'] = []
  let changed = false

  SIM_TRAIN_FIELDS.forEach((field) => {
    if (before?.[field] === after[field]) {
      return
    }

    if (after[field] === undefined) {
      if (field === 'occupancySegmentId' && before?.[field] !== undefined) {
        cleared.push(field)
        changed = true
      }

      return
    }

    ;(patch as Record<SimTrainField, unknown>)[field] = after[field]
    changed = true
  })

  if (cleared.length > 0) {
    patch.cleared = cleared
  }

  return changed ? patch : undefined
}

export function createSimPatch(before: OccSessionState, after: OccSessionState): SimPatch | undefined {
  const patch: SimPatch = {}

  if (before.trains !== after.trains) {
    const beforeById = new Map(before.trains.map((train) => [train.id, train]))
    const trains = after.trains
      .map((train) => diffTrain(beforeById.get(train.id), train))
      .filter((train): train is SimTrainPatch => Boolean(train))

    if (trains.length > 0) {
      patch.trains = trains
    }
  }

  if (before.lineMap !== after.lineMap) {
    const beforeLineMap = normalizeLineMapRuntimeState(before.lineMap)
    const afterLineMap = normalizeLineMapRuntimeState(after.lineMap)
    const routeSegments = diffKeyed(beforeLineMap.routeSegments, afterLineMap.routeSegments)
    const platformDoorStates = diffKeyed(beforeLineMap.platformDoorStates, afterLineMap.platformDoorStates)

    if (routeSegments) {
      patch.routeSegments = routeSegments
    }

    if (platformDoorStates) {
      patch.platformDoorStates = platformDoorStates
    }
  }

  if (before.timetableRows !== after.timetableRows) {
    const rows = after.timetableRows.flatMap((row, index) => (
      before.timetableRows[index] !== row && before.timetableRows[index]?.state !== row.state
        ? [{ index, state: row.state, train: row.train }]
        : []
    ))

    if (rows.length > 0) {
      patch.timetableRows = rows
    }
  }

  if (before.timetableClock !== after.timetableClock && JSON.stringify(before.timetableClock) !== JSON.stringify(after.timetableClock)) {
    patch.timetableClock = after.timetableClock
  }

  return Object.keys(patch).length > 0 ? patch : undefined
}

function applyKeyed<T>(current: Record<string, T>, patch: SimKeyedPatch<T> | undefined) {
  if (!patch) {
    return current
  }

  const next = { ...current, ...(patch.set ?? {}) }

  ;(patch.remove ?? []).forEach((key) => {
    delete next[key]
  })

  return next
}

function pickSimTrainFields(patch: SimTrainPatch) {
  const fields: Partial<Pick<TrainState, SimTrainField>> = {}

  SIM_TRAIN_FIELDS.forEach((field) => {
    if (patch[field] !== undefined) {
      ;(fields as Record<SimTrainField, unknown>)[field] = patch[field]
    }
  })

  return fields
}

export function applySimPatch(session: OccSessionState, patch: SimPatch): OccSessionState {
  let next = session

  if (patch.trains?.length) {
    const patches = new Map(patch.trains.map((train) => [train.id, train]))
    const knownIds = new Set(session.trains.map((train) => train.id))
    const trains = session.trains.map((train) => {
      const trainPatch = patches.get(train.id)

      if (!trainPatch) {
        return train
      }

      const updated: TrainState = { ...train, ...pickSimTrainFields(trainPatch) }

      if (trainPatch.cleared?.includes('occupancySegmentId')) {
        updated.occupancySegmentId = undefined
      }

      return updated
    })
    // A scenario workflow can put a train on the map that the roster lacks.
    const added = patch.trains
      .filter((train) => !knownIds.has(train.id) && typeof train.x === 'number' && typeof train.y === 'number')
      .map((train): TrainState => ({
        direction: 'right',
        service: '',
        status: 'WAIT',
        x: 0,
        y: 0,
        ...pickSimTrainFields(train),
        id: train.id,
      }))

    next = { ...next, trains: [...trains, ...added] }
  }

  if (patch.routeSegments || patch.platformDoorStates) {
    const lineMap = normalizeLineMapRuntimeState(next.lineMap)

    next = {
      ...next,
      lineMap: {
        ...lineMap,
        platformDoorStates: applyKeyed(lineMap.platformDoorStates, patch.platformDoorStates),
        routeSegments: applyKeyed(lineMap.routeSegments, patch.routeSegments),
      },
    }
  }

  if (patch.timetableRows?.length) {
    let rows = [...next.timetableRows]

    patch.timetableRows.forEach(({ index, state, train }) => {
      if (typeof state !== 'string' || typeof train !== 'string') {
        return
      }

      const rowIndex = rows[index]?.train === train ? index : rows.findIndex((row) => row.train === train)

      if (rowIndex >= 0) {
        rows[rowIndex] = { ...rows[rowIndex], state }
      } else {
        rows = upsertTimetableRow(rows, train, state)
      }
    })
    next = { ...next, timetableRows: rows }
  }

  if (patch.timetableClock) {
    next = { ...next, timetableClock: patch.timetableClock }
  }

  return next
}
