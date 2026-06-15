import type { TrainState } from '../../types'

export const ARRIVAL_TIME_STATION_OPTIONS = [
  'HBF',
  'OTP',
  'CNT',
  'CQY',
  'DBG',
  'LTI',
  'FRP',
  'BNK',
  'PTP',
  'WLH',
  'SER',
  'KVN',
  'HGN',
  'BGK',
  'SKG',
  'PGL',
  'PGC',
  'NED',
] as const

export const ARRIVAL_TIME_STATION_MENU_OPTIONS = ARRIVAL_TIME_STATION_OPTIONS
export const ARRIVAL_TIME_STATION_VISIBLE_ROWS = 8
export const ARRIVAL_TIME_STATION_SCROLL_TRACK_HEIGHT = 132
export const PLATFORM_SIDING_VISIBLE_ROWS = 6
export const PLATFORM_SIDING_SCROLL_TRACK_HEIGHT = 90

const NED_PLATFORM_SIDING_OPTIONS = [
  'W4',
  'W3',
  'W2',
  'W1',
  'UC',
  'TTW',
  'TTE',
  'TT1N',
  'TT1',
  'T820',
  'S9W',
  'S9E',
  'S8W',
  'S8E',
  'S7W',
  'S7E',
  'S6W',
  'S6E',
  'S5W',
  'S5E',
  'S4W',
  'S4E',
  'S3W',
  'S3E',
  'S2W',
  'S2E',
  'S1W',
  'S1E',
  '12W',
  'S12E',
  'S10W',
  'S10E',
  'RT3D',
  'RT2D',
  'RT1D',
  'H5',
  'H3',
] as const

export type TrainTimeSelection = {
  command: string
  kind: 'arrival' | 'departure'
  platformSiding: string
  station: string
}

export function getPlatformSidingMenuOptions(station: string, direction: 'NB' | 'SB'): readonly string[] {
  if (!station) {
    return [] as const
  }

  if (station === 'NED') {
    return NED_PLATFORM_SIDING_OPTIONS
  }

  return getChangeEndsPlatformSidingMenuOptions(station, direction)
}

export function getTrainServiceDirectionLabel(train: Pick<TrainState, 'direction' | 'service'>): 'NB' | 'SB' {
  if (train.service === 'NB' || train.service === 'SB') {
    return train.service
  }

  return train.direction === 'left' ? 'SB' : 'NB'
}

export function getChangeEndsPlatformSidingMenuOptions(station: string, direction: 'NB' | 'SB'): readonly string[] {
  if (!station) {
    return [] as const
  }

  const preferred = `${station}${direction === 'NB' ? 'N' : 'S'}`
  const alternate = `${station}${direction === 'NB' ? 'S' : 'N'}`

  return [preferred, alternate] as const
}

export function isRt2DepotArrivalDestination(selection: TrainTimeSelection | undefined) {
  return selection?.kind === 'arrival'
    && selection.station === 'NED'
    && selection.platformSiding === 'RT2D'
}

export function hasTrainMovementDestination(selection: TrainTimeSelection | undefined) {
  return selection?.kind === 'arrival'
    && selection.station.trim().length > 0
    && selection.platformSiding.trim().length > 0
}
