import { prependAlarmRows } from './alarmAcknowledgement'
import { createMonitorEvent, createSummaryEvent, formatScenarioTime } from './scenarioWorkflow'
import { getActiveTrainingScenarioTargetTrainId } from './training-scenarios/targetSelection'
import type { MonitorAlarmRow, OccSessionState } from './types'

// Routine alarms that arrive during a shift, as on the reference Alarms screen,
// so the list is never just the incident. They arrive unacknowledged and grey,
// name trains in the SKG-PGC area (never the scenario's train) and are not
// scored. The server adds one every BACKGROUND_ALARM_INTERVAL_MS while an
// exercise is running.

export const BACKGROUND_ALARM_INTERVAL_MS = { max: 180_000, min: 90_000 } as const

const TRAIN_ALARMS = [
  { message: (trainId: string) => `Train ${trainId}: Train Hold`, value: 'NOT APPLIED' },
  { message: (trainId: string) => `Train ${trainId}: Train Emergency Brake`, value: 'NOT APPLIED' },
  { message: (trainId: string) => `Train ${trainId}: Status of Train Hold Request`, value: 'AUTOMATIC HOLD' },
  { message: (trainId: string) => `Train ${trainId}: Train Skip Stop Demand`, value: 'FAILED: RET. COND' },
] as const

// Signal routes in the SKG-PGC area; the panel follows the entry signal.
const AREA_ROUTES = ['613_621', '617_619', '619_701', '701_705', '705_707', '707_1101', '1101_1105', '1105_1107', '1102_704', '704_700', '700_608'] as const

function getRoutePanel(entrySignal: string) {
  return entrySignal.startsWith('11') ? 'PGC' : entrySignal.startsWith('7') ? 'PGL' : 'SKG'
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]
}

export function createBackgroundAlarmEvent(session: OccSessionState, random: () => number = Math.random): MonitorAlarmRow {
  const targetTrainId = getActiveTrainingScenarioTargetTrainId(session)
  const areaTrainIds = session.trains
    .filter((train) => train.timetablePlayback && train.lineMapVisible !== false && train.id !== targetTrainId)
    .map((train) => train.id)
  const kind = random()

  if (areaTrainIds.length > 0 && kind < 0.7) {
    const alarm = pick(TRAIN_ALARMS, random)
    const trainId = pick(areaTrainIds, random)

    return createMonitorEvent(trainId, alarm.message(trainId), alarm.value, 'yellow')
  }

  if (kind < 0.9) {
    const route = pick(AREA_ROUTES, random)
    const entrySignal = route.split('_')[0]

    return {
      asset: `${getRoutePanel(entrySignal)}_ROUT_S${entrySignal}`,
      level: 'S',
      message: `Route abandoned: R${route}/Management of Route Control`,
      time: formatScenarioTime(),
      tone: 'yellow',
      value: '',
    }
  }

  return { asset: 'SIG/NED/1133/DMS0003', level: 'S', message: 'DMS:HMI Status', time: formatScenarioTime(), tone: 'yellow', value: 'OK' }
}

export function addBackgroundAlarm(session: OccSessionState, random: () => number = Math.random): OccSessionState {
  const event = createBackgroundAlarmEvent(session, random)

  return {
    ...session,
    alarmSummaryRows: prependAlarmRows([createSummaryEvent(event, 'grey')], session.alarmSummaryRows),
    eventRows: [event, ...session.eventRows].slice(0, 4),
  }
}

export function getNextBackgroundAlarmDelayMs(random: () => number = Math.random) {
  const { max, min } = BACKGROUND_ALARM_INTERVAL_MS

  return min + Math.round(random() * (max - min))
}
