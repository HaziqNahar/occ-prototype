import MonitorWorkspace from '../components/MonitorWorkspace'
import AlarmsMonitorContent from './AlarmsMonitorContent'
import type { MonitorScreenProps } from './monitorScreenTypes'

export default function AlarmsScreen({
  onNavigate,
  session,
  dispatch,
}: MonitorScreenProps) {
  return (
    <MonitorWorkspace
      monitorLabel="MONITOR 01 - ALARMS"
      onNavigate={onNavigate}
      scadaFirst
      session={session}
      title="Alarm Summary Monitor"
    >
      <AlarmsMonitorContent onNavigate={onNavigate} session={session} dispatch={dispatch} />
    </MonitorWorkspace>
  )
}
