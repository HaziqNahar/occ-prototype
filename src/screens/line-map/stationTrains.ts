import type { OccSessionState, TrainState } from '../../types'
import { platformData } from './model'

// A station panel's ROUTE, DISPATCH and HII act on the train at that station,
// as at the OCC: only the panel at the train's station commands it.

// Half a platform: trains stopped at a platform sit within a few units of its
// x (fault trains at +4); stations are at least ~150 apart.
const STATION_REACH = 45

export function getTrainsAtStation(trains: readonly TrainState[], station: string) {
  const platform = platformData.find((item) => item.code === station)

  return platform
    ? trains.filter((train) => train.lineMapVisible !== false && Math.abs(train.x - platform.x) <= STATION_REACH)
    : []
}

export function isTrainAtStation(train: TrainState | undefined, station: string) {
  return Boolean(train && getTrainsAtStation([train], station).length > 0)
}

// The train a panel command goes to. Usually only one train there needs an
// action; when both bounds have a train, the scenario train, then the
// selected train, comes first.
export function getStationPanelTrain(session: Pick<OccSessionState, 'activeScenario' | 'selectedTrainId' | 'trains'>, station: string) {
  const atStation = getTrainsAtStation(session.trains, station)

  return atStation.find((train) => train.id === session.activeScenario.targetTrainId)
    ?? atStation.find((train) => train.id === session.selectedTrainId)
    ?? atStation[0]
}
