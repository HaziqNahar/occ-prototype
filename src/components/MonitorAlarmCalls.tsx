import { useState } from 'react'
import alarmAckIcon from '../assets/alarm-icons/alarm_ack.png'
import alarmDisplayIcon from '../assets/alarm-icons/alarm_display.png'
import type { CommsChannel, CommsLogEntry } from '../comms/commsCatalog'
import type { AlarmBannerRow } from '../sessionState'
import { stationRibbonItems } from '../screens/line-map/model'
import type { AppRoute } from '../types'

type AlarmCallsHeaderDomProps = {
  alarmBannerRows?: readonly AlarmBannerRow[]
  alarmNotAcknowledged?: number
  alarmTotal?: number
  callLog?: readonly CommsLogEntry[]
  onOpenComms?: (channel: CommsChannel) => void
  initialTab?: 'alarms' | 'calls'
  onNavigate: (route: AppRoute) => void
}

export function AlarmCallsHeaderDom({
  alarmBannerRows = [],
  alarmNotAcknowledged = 0,
  alarmTotal = 0,
  callLog = [],
  initialTab = 'calls',
  onNavigate,
  onOpenComms,
}: AlarmCallsHeaderDomProps) {
  const [activeSideTab, setActiveSideTab] = useState<'alarms' | 'calls'>(initialTab)
  const radioCount = callLog.filter((call) => call.channel === 'RADIO').length
  const telephoneCount = callLog.filter((call) => call.channel === 'TELEPHONE').length

  return (
    <section
      aria-label="Calls and alarm summary"
      className={`line-map-alarm-strip line-map-alarm-strip--${activeSideTab}`}
    >
      <div className="line-map-edge-tab-stack" role="tablist" aria-label="Alarm and call views">
        <button
          aria-controls="line-map-alarms-tabpanel"
          aria-selected={activeSideTab === 'alarms'}
          className={`line-map-edge-tab line-map-edge-tab--alarms ${activeSideTab === 'alarms' ? 'line-map-edge-tab--active' : ''}`}
          id="line-map-alarms-tab"
          onClick={() => setActiveSideTab('alarms')}
          onPointerDown={() => setActiveSideTab('alarms')}
          role="tab"
          type="button"
        >
          <span>Alarms</span>
        </button>
        <button
          aria-controls="line-map-calls-tabpanel"
          aria-selected={activeSideTab === 'calls'}
          className={`line-map-edge-tab line-map-edge-tab--calls ${activeSideTab === 'calls' ? 'line-map-edge-tab--active' : ''}`}
          id="line-map-calls-tab"
          onClick={() => setActiveSideTab('calls')}
          onPointerDown={() => setActiveSideTab('calls')}
          role="tab"
          type="button"
        >
          <span>Calls</span>
        </button>
      </div>
      {activeSideTab === 'calls' ? (
        <div
          aria-labelledby="line-map-calls-tab"
          className="line-map-calls-workspace"
          id="line-map-calls-tabpanel"
          role="tabpanel"
        >
          <div className="line-map-call-controls" aria-label="Call controls">
            <span className="line-map-call-control line-map-call-control--active line-map-call-control--spaced">PEC 0</span>
            <span className="line-map-call-control line-map-call-control--active">RATIS 0</span>
            <button
              className={`line-map-call-control ${onOpenComms ? 'line-map-call-control--button' : 'line-map-call-control--inactive'}`}
              disabled={!onOpenComms}
              onClick={() => onOpenComms?.('TELEPHONE')}
              type="button"
            >
              Teleph. {telephoneCount}
            </button>
            <button
              className={`line-map-call-control ${onOpenComms ? 'line-map-call-control--button line-map-call-control--active' : 'line-map-call-control--active'}`}
              disabled={!onOpenComms}
              onClick={() => onOpenComms?.('RADIO')}
              type="button"
            >
              Radio {radioCount}
            </button>
            <span className="line-map-call-control line-map-call-control--active">Author. 0</span>
            <span className="line-map-call-control line-map-call-control--active line-map-call-control--spaced">PCP 0</span>
          </div>
          <span className="line-map-call-indicator" aria-hidden="true" />
          <div className="line-map-call-list-shell">
            <div className="line-map-call-list" aria-label="Call list">
              {callLog.slice(0, 5).map((call) => (
                <div className="line-map-call-row" key={call.id}>
                  <span>{call.time}</span>
                  <span>{call.channel === 'RADIO' ? 'RADIO' : 'TELEPH'}</span>
                  <span>{call.recipient}</span>
                  <span>{call.detail ? `${call.label} (${call.detail})` : call.label}</span>
                </div>
              ))}
            </div>
            <div className="line-map-call-scrollbar" aria-hidden="true">
              <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--up" />
              <span className="line-map-alarm-scrollbar-track" />
              <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--down" />
            </div>
          </div>
        </div>
      ) : (
        <div
          aria-labelledby="line-map-alarms-tab"
          className="line-map-alarms-workspace"
          id="line-map-alarms-tabpanel"
          role="tabpanel"
        >
          <div className="line-map-alarm-counts">
            <label>Not Ack <output>{alarmNotAcknowledged}</output></label>
            <label>Total <output>{alarmTotal}</output></label>
            <button
              aria-label="Open alarms"
              className="line-map-alarm-clear"
              onClick={() => onNavigate('/screen/alarms')}
              type="button"
            >
              <img alt="" src={alarmAckIcon} />
            </button>
            <a aria-label="Display alarms page" className="line-map-alarm-display" href="/screen/alarms">
              <img alt="" src={alarmDisplayIcon} />
              Display
            </a>
          </div>
          <div className="line-map-alarm-table">
            {alarmBannerRows.map((row) => (
              <button
                className={`line-map-alarm-row line-map-alarm-row--${row.tone}`}
                key={`${row.time}-${row.asset}-${row.description}`}
                onClick={() => onNavigate('/screen/alarms')}
                type="button"
              >
                <span>{row.mms}</span>
                <span>{row.time}</span>
                <span>{row.asset}</span>
                <span>{row.description}</span>
                <span>{row.value}</span>
              </button>
            ))}
          </div>
          <div className="line-map-alarm-scrollbar" aria-hidden="true">
            <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--up" />
            <span className="line-map-alarm-scrollbar-track" />
            <span className="line-map-alarm-scrollbar-button line-map-alarm-scrollbar-button--down" />
          </div>
        </div>
      )}
    </section>
  )
}

export function StationRibbon({ top }: { top: number }) {
  return (
    <div className="line-map-station-ribbon" style={{ top }}>
      <div className="line-map-station-line" />
      {stationRibbonItems.map((station) => (
        <div className="line-map-station-node" key={station.label} style={{ left: station.x }}>
          <span>{station.label}</span>
          {station.label.includes('DEPOT') ? null : <i />}
        </div>
      ))}
      <strong>OVERALL</strong>
    </div>
  )
}
