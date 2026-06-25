import type { TimetableClockState, TimetableRow } from './types'
import type { TimetablePlaybackPlan } from './screens/line-map/timetablePlayback'
import {
  getSecondsIntoTimetableDay,
  getTimetableRowStartSeconds,
} from './screens/line-map/timetablePlayback'

const SECONDS_PER_TIMETABLE_DAY = 24 * 60 * 60
const DEFAULT_PLAYBACK_SPEED = 20

export const DEFAULT_TIMETABLE_CLOCK_STATE: TimetableClockState = {
  mode: 'LIVE',
  playbackSpeed: DEFAULT_PLAYBACK_SPEED,
  playbackStartEpochMs: 0,
  playbackStartSeconds: 0,
}

function wrapTimetableSeconds(seconds: number) {
  return ((seconds % SECONDS_PER_TIMETABLE_DAY) + SECONDS_PER_TIMETABLE_DAY) % SECONDS_PER_TIMETABLE_DAY
}

function normalizePlaybackSpeed(speed: number | undefined) {
  return Number.isFinite(speed) && Number(speed) > 0 ? Number(speed) : DEFAULT_PLAYBACK_SPEED
}

export function normalizeTimetableClockState(
  clock: Partial<TimetableClockState> | undefined,
): TimetableClockState {
  return {
    mode: clock?.mode === 'PLAYBACK' ? 'PLAYBACK' : 'LIVE',
    playbackSpeed: normalizePlaybackSpeed(clock?.playbackSpeed),
    playbackStartEpochMs: Number.isFinite(clock?.playbackStartEpochMs)
      ? Number(clock?.playbackStartEpochMs)
      : DEFAULT_TIMETABLE_CLOCK_STATE.playbackStartEpochMs,
    playbackStartSeconds: Number.isFinite(clock?.playbackStartSeconds)
      ? wrapTimetableSeconds(Number(clock?.playbackStartSeconds))
      : DEFAULT_TIMETABLE_CLOCK_STATE.playbackStartSeconds,
  }
}

export function getFirstTimetablePlaybackStartSeconds(rows: readonly TimetableRow[]) {
  const startSeconds = rows
    .map(getTimetableRowStartSeconds)
    .filter((value): value is number => value !== undefined)

  return startSeconds.length > 0 ? Math.min(...startSeconds) : undefined
}

export function startTimetablePlaybackClock(
  rows: readonly TimetableRow[],
  systemNow = new Date(),
  playbackSpeed = DEFAULT_PLAYBACK_SPEED,
): TimetableClockState {
  return {
    mode: 'PLAYBACK',
    playbackSpeed: normalizePlaybackSpeed(playbackSpeed),
    playbackStartEpochMs: systemNow.getTime(),
    playbackStartSeconds: getFirstTimetablePlaybackStartSeconds(rows) ?? getSecondsIntoTimetableDay(systemNow),
  }
}

export function getTimetableClockNow(
  clock: Partial<TimetableClockState> | undefined,
  systemNow = new Date(),
) {
  const state = normalizeTimetableClockState(clock)

  if (state.mode === 'LIVE') {
    return systemNow
  }

  const elapsedRealSeconds = Math.max(0, (systemNow.getTime() - state.playbackStartEpochMs) / 1000)
  const playbackSeconds = wrapTimetableSeconds(
    state.playbackStartSeconds + (elapsedRealSeconds * state.playbackSpeed),
  )
  const playbackNow = new Date(systemNow)

  playbackNow.setHours(0, 0, 0, 0)
  playbackNow.setSeconds(playbackSeconds)

  return playbackNow
}

export function formatTimetableClockTime(clock: Partial<TimetableClockState> | undefined, systemNow = new Date()) {
  const current = getTimetableClockNow(clock, systemNow)

  return current.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function createTimetableClockKey(clock: Partial<TimetableClockState> | undefined) {
  const state = normalizeTimetableClockState(clock)

  return [
    state.mode,
    state.playbackSpeed,
    state.playbackStartEpochMs,
    state.playbackStartSeconds,
  ].join(':')
}

export function scaleTimetablePlaybackPlansForClock(
  plans: readonly TimetablePlaybackPlan[],
  clock: Partial<TimetableClockState> | undefined,
): TimetablePlaybackPlan[] {
  const state = normalizeTimetableClockState(clock)

  if (state.mode !== 'PLAYBACK' || state.playbackSpeed <= 1) {
    return [...plans]
  }

  return plans.map((plan) => ({
    ...plan,
    stepOffsetsMs: plan.stepOffsetsMs.map((offsetMs) => Math.max(0, offsetMs / state.playbackSpeed)),
    stepSignedOffsetsMs: plan.stepSignedOffsetsMs.map((offsetMs) => offsetMs / state.playbackSpeed),
  }))
}
