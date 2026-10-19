import type { AppRoute } from './types'

const monitorWindows: Array<{ name: string; path: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
]

// Where a monitor opens: an exercise's monitors (?session=<code>) have windows
// of their own, so opening one again brings the same window forward.
export function getMonitorWindow(path: AppRoute, exercise?: { code: string; number: number }) {
  const monitor = monitorWindows.find((item) => item.path === path)!

  return exercise
    ? { name: `${monitor.name}-exercise-${exercise.number}`, url: `${path}?session=${encodeURIComponent(exercise.code)}` }
    : { name: monitor.name, url: path }
}

// Opens (or brings forward) the three OCC monitor windows on this PC. Without
// an exercise they show the signed-in person's own; the trainer console opens
// them on one exercise (?session=<code>), in windows of their own.
// Returns what to tell the person when the browser blocked some of them
// (browsers allow one new window per click until pop-ups are allowed).
export function openOccMonitors(exercise?: { code: string; number: number }): string {
  const blocked = monitorWindows.filter((monitor) => {
    const target = getMonitorWindow(monitor.path, exercise)

    return !window.open(target.url, target.name)
  }).length

  return blocked === 0
    ? ''
    : `The browser blocked ${blocked} of ${monitorWindows.length} monitor windows. Click the pop-up icon at the right of the address bar, choose Always allow for ${window.location.host}, then click again.`
}
