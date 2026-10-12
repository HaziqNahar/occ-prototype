import type { DispatchSessionCommand } from '../useOccSession'
import type { AppRoute, OccSessionState } from '../types'

export interface MonitorScreenProps {
  dispatch: DispatchSessionCommand
  onNavigate: (route: AppRoute) => void
  session: OccSessionState
}
