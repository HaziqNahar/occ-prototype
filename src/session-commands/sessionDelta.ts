import type { OccSessionState } from '../types'

// What the server broadcasts after each change: only the parts of the session
// that changed. The timetable alone is ~200 KB, so lists are sent row by row.

type ListKey = 'timetableRows' | 'trains'

export type SessionListDelta<T> =
  | { items: T[]; mode: 'replace' }
  | { changes: Array<[number, T]>; mode: 'rows' }

export type SessionDelta = {
  set?: Partial<Omit<OccSessionState, ListKey>>
  timetableRows?: SessionListDelta<OccSessionState['timetableRows'][number]>
  trains?: SessionListDelta<OccSessionState['trains'][number]>
}

function diffList<T>(before: readonly T[], after: readonly T[]): SessionListDelta<T> | undefined {
  if (before === after) {
    return undefined
  }

  if (before.length !== after.length) {
    return { items: [...after], mode: 'replace' }
  }

  const changes: Array<[number, T]> = []

  after.forEach((item, index) => {
    if (before[index] !== item) {
      changes.push([index, item])
    }
  })

  if (changes.length === 0) {
    return undefined
  }

  return changes.length > after.length / 2
    ? { items: [...after], mode: 'replace' }
    : { changes, mode: 'rows' }
}

function applyList<T>(current: readonly T[], delta: SessionListDelta<T> | undefined): T[] {
  if (!delta) {
    return current as T[]
  }

  if (delta.mode === 'replace') {
    return delta.items
  }

  const next = [...current]

  delta.changes.forEach(([index, item]) => {
    next[index] = item
  })

  return next
}

// Compares by reference: the session reducers keep unchanged parts as they were.
export function createSessionDelta(before: OccSessionState, after: OccSessionState): SessionDelta | undefined {
  const set: Record<string, unknown> = {}

  ;(Object.keys(after) as Array<keyof OccSessionState>).forEach((key) => {
    if (key !== 'trains' && key !== 'timetableRows' && before[key] !== after[key]) {
      set[key] = after[key]
    }
  })

  const trains = diffList(before.trains, after.trains)
  const timetableRows = diffList(before.timetableRows, after.timetableRows)

  if (Object.keys(set).length === 0 && !trains && !timetableRows) {
    return undefined
  }

  return {
    ...(Object.keys(set).length > 0 ? { set: set as SessionDelta['set'] } : {}),
    ...(trains ? { trains } : {}),
    ...(timetableRows ? { timetableRows } : {}),
  }
}

export function applySessionDelta(session: OccSessionState, delta: SessionDelta): OccSessionState {
  return {
    ...session,
    ...(delta.set ?? {}),
    timetableRows: applyList(session.timetableRows, delta.timetableRows),
    trains: applyList(session.trains, delta.trains),
  }
}
