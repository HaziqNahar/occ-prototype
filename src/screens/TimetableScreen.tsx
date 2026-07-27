import MonitorWorkspace from '../components/MonitorWorkspace'
import TimetableMonitorContent from './TimetableMonitorContent'
import type { MonitorScreenProps } from './monitorScreenTypes'

export default function TimetableScreen({
  onNavigate,
  session,
  updateSession,
}: MonitorScreenProps) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 03 - TIMETABLE"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Traffic Timetable Monitor"
    >
      <TimetableMonitorContent onNavigate={onNavigate} session={session} updateSession={updateSession} />
    </MonitorWorkspace>
  )
}
