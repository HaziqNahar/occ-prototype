import type { OccSessionState, SessionScreenRole } from './types'

// Screens heartbeat every 15 s, so one missed beat or more means the window is closed.
const ONLINE_WINDOW_MS = 45_000

export const occMonitors: ReadonlyArray<{ label: string; role: SessionScreenRole }> = [
  { label: 'Alarms', role: 'ALARM' },
  { label: 'Line Map', role: 'LINE_MAP' },
  { label: 'Timetable', role: 'TIMETABLE' },
]

export function isScreenOnline(session: OccSessionState, role: SessionScreenRole, now = Date.now()) {
  const lastSeenAt = session.sessionMeta?.screens?.[role]?.lastSeenAt

  return Boolean(lastSeenAt && now - Date.parse(lastSeenAt) <= ONLINE_WINDOW_MS)
}

export function getOnlineMonitors(session: OccSessionState, now = Date.now()) {
  return occMonitors.filter((monitor) => isScreenOnline(session, monitor.role, now))
}
