import { platformData } from '../screens/line-map/model'
import type { CoachTarget } from '../training-scenarios/hints'
import type { OccSessionState } from '../types'

// Finds a coach target on the monitor's own screen. The SCADA replica is not
// changed for this: targets are found by the hooks it already has (test ids,
// tab ids and visible labels).

export const LINE_MAP_PAN_EVENT = 'occ-training-aids:pan'

export type LineMapPanRequest = { x: number }

// Asks the Line Map (App.tsx, MonitorCanvas) to pan so world x is on screen.
export function requestLineMapPan(x: number) {
  window.dispatchEvent(new CustomEvent<LineMapPanRequest>(LINE_MAP_PAN_EVENT, { detail: { x } }))
}

// Where a Line Map target is on the whole map, so the map can pan to it first.
export function getTargetWorldX(session: OccSessionState, target: CoachTarget) {
  if (target.kind === 'train') {
    return session.trains.find((train) => train.id === target.trainId)?.x
  }

  if (target.kind === 'stationButton') {
    return platformData.find((platform) => platform.code === target.station)?.x
  }

  return undefined
}

function findButtonByText(root: ParentNode, selector: string, test: (text: string) => boolean) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).find((element) => test(element.textContent?.trim() ?? '')) ?? null
}

export function findTargetElement(session: OccSessionState, target: CoachTarget): HTMLElement | null {
  switch (target.kind) {
    case 'train':
      return document.querySelector<HTMLElement>(`[data-testid^="train-hotspot-${target.trainId}-"]`)
    case 'stationButton': {
      const platform = platformData.find((item) => item.code === target.station)

      return platform
        ? document.querySelector<HTMLElement>(`[data-testid="line-map-command-${target.command}-${Math.round(platform.x)}"]`)
        : null
    }
    case 'timetableRow':
      return document.querySelector<HTMLElement>(`[data-testid^="timetable-row-${target.trainId}-"]`)
    case 'calls': {
      const tab = document.getElementById('line-map-calls-tab')

      // Once the Calls tab is open, the next click is the channel button.
      if (tab?.getAttribute('aria-selected') !== 'true') {
        return tab
      }

      const label = target.channel === 'RADIO' ? 'Radio' : 'Teleph.'

      return findButtonByText(document, '.line-map-call-controls button', (text) => text.startsWith(label))
    }
    case 'alarmRow': {
      const alarm = session.alarmSummaryRows.find((row) => row.scenarioAlarm && row.description.includes(`Train ${target.trainId}`))
        ?? session.alarmSummaryRows.find((row) => row.scenarioAlarm)

      if (!alarm) {
        return null
      }

      const row = findButtonByText(document, '.alarm-dom-row--data', (text) => text.includes(alarm.description))

      // Once the row is selected, the next click is Ack. selection.
      return row?.getAttribute('aria-pressed') === 'true'
        ? findButtonByText(document, '.scada-dom-button', (text) => text === 'Ack. selection')
        : row
    }
  }
}
