import type { AppRoute } from './types'

const monitorWindows: Array<{ name: string; path: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
]

// Opens (or brings forward) the three OCC monitor windows on this PC.
export function openOccMonitors() {
  monitorWindows.forEach((monitor) => window.open(monitor.path, monitor.name))
}
