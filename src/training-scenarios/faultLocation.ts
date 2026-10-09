import { MAP_SECTION_OFFSETS, platformData } from '../screens/line-map/model'
import type { OccSessionState, TrainState } from '../types'

// Where a fault scenario happens: the train held at a station platform, on one bound.
// Trainers get a random location each run so trainees cannot learn the answer.
export type FaultLocation = {
  station: string
  track: 'NB' | 'SB'
  trainId: string
}

// Train 317 already sits at BGK northbound on the line map; used when no location is chosen.
export const DEFAULT_FAULT_LOCATION: FaultLocation = { station: 'BGK', track: 'NB', trainId: '317' }

// Train marker rows on the line map: northbound runs along the top track,
// southbound along the bottom track, which sits slightly lower in the middle sections.
const NORTHBOUND_TRAIN_Y = 205

function getSouthboundTrainY(x: number) {
  return x >= MAP_SECTION_OFFSETS.section02 && x < MAP_SECTION_OFFSETS.section04 ? 512 : 508
}

export function resolveFaultText(text: string, location?: Partial<FaultLocation>) {
  return text
    .replaceAll('{train}', location?.trainId ?? 'the train')
    .replaceAll('{station}', location?.station ?? 'the station')
    .replaceAll(' {bound}', location?.track ? ` ${location.track}` : '')
    .replaceAll('{bound}', location?.track ?? '')
}

export function pickRandomFaultLocation(session: OccSessionState, random: () => number = Math.random): FaultLocation {
  const pick = <T,>(items: readonly T[]) => items[Math.min(items.length - 1, Math.floor(random() * items.length))]
  // Prefer a train that is not already running on the map, so nothing jumps across it.
  const idleTrains = session.trains.filter((train) => train.lineMapVisible !== true && !train.isMoving)
  const train = pick(idleTrains.length > 0 ? idleTrains : session.trains)

  return {
    station: pick(platformData).code,
    track: random() < 0.5 ? 'NB' : 'SB',
    trainId: train?.id ?? DEFAULT_FAULT_LOCATION.trainId,
  }
}

export function placeFaultTrain(trains: TrainState[], location: FaultLocation): TrainState[] {
  const platform = platformData.find((item) => item.code === location.station)

  if (!platform) {
    return trains
  }

  const x = platform.x + 4

  return trains.map((train) => (
    train.id === location.trainId
      ? {
          ...train,
          direction: location.track === 'NB' ? 'right' as const : 'left' as const,
          isMoving: false,
          lineMapVisible: true,
          occupancySegmentId: undefined,
          service: location.track,
          status: 'HOLD' as const,
          timetablePlayback: false,
          x,
          y: location.track === 'NB' ? NORTHBOUND_TRAIN_Y : getSouthboundTrainY(x),
        }
      : train
  ))
}
