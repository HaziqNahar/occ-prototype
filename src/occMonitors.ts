import type { AppRoute } from './types'

const monitorWindows: Array<{ name: string; path: AppRoute }> = [
  { name: 'occ-monitor-1-alarms', path: '/screen/alarms' },
  { name: 'occ-monitor-2-line-map', path: '/screen/line-map' },
  { name: 'occ-monitor-3-timetable', path: '/screen/timetable' },
]

// Opens (or brings forward) the three OCC monitor windows on this PC. Without
// an exercise they show the signed-in person's own; the trainer console opens
// them on one exercise (?session=<code>), in windows of their own.
// Returns what to tell the person when the browser blocked some of them
// (browsers allow one new window per click until pop-ups are allowed).
export function openOccMonitors(exercise?: { code: string; number: number }): string {
  const blocked = monitorWindows.filter((monitor) => !window.open(
    exercise ? `${monitor.path}?session=${encodeURIComponent(exercise.code)}` : monitor.path,
    exercise ? `${monitor.name}-exercise-${exercise.number}` : monitor.name,
  )).length

  return blocked === 0
    ? ''
    : `The browser blocked ${blocked} of ${monitorWindows.length} monitor windows. Click the pop-up icon at the right of the address bar, choose Always allow for ${window.location.host}, then click again.`
}
