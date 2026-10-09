import { useMemo, useState } from 'react'
import { applyCommsRequest, getCommsLog } from '../comms/commsCatalog'
import type { CommsChannel } from '../comms/commsCatalog'
import CommsDialog from '../components/CommsDialog'
import { ScadaDomButton } from '../components/LegacyScadaFooter'
import ScadaDomSurface from '../components/ScadaDomSurface'
import ScadaFooter from '../components/ScadaFooter'
import { AlarmCallsHeaderDom, StationRibbon } from '../components/MonitorAlarmCalls'
import { submitBackendScenarioAction } from '../scenarioWorkflow'
import { getAlarmSummaryCounts } from '../sessionState'
import { applyTrainingScenarioRuntimeEvent } from '../trainingScenarios'
import type { AlarmSummaryRow } from '../types'
import type { MonitorScreenProps } from './monitorScreenTypes'
export default function AlarmsMonitorContent({
  onNavigate,
  session,
  updateSession,
}: MonitorScreenProps) {
  const rows = session.alarmSummaryRows
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'Archives' | 'Events' | 'Alarms'>('Alarms')
  const [statusNote, setStatusNote] = useState('Live alarm summary ready')
  const [commsChannel, setCommsChannel] = useState<CommsChannel | null>(null)
  const callLog = useMemo(() => getCommsLog(session.evidenceLog), [session.evidenceLog])
  const liveRows = rows.map((row, originalIndex) => ({ originalIndex, row }))
  const visibleRows = liveRows.slice(0, 20)
  const selectedEntry = selectedIndex >= 0 ? liveRows[selectedIndex] : undefined
  const selectedRow = selectedEntry?.row
  const { notAcknowledged, total: alarmTotal } = getAlarmSummaryCounts(rows)
  const liveRowIndexes = new Set(liveRows.map(({ originalIndex }) => originalIndex))

  const rowToneClass = (tone: AlarmSummaryRow['tone']) => {
    if (tone === 'red') {
      return 'is-red'
    }

    if (tone === 'grey') {
      return 'is-grey'
    }

    return 'is-yellow'
  }

  const selectAlarmRow = (index: number) => {
    const entry = liveRows[index]

    if (!entry) {
      setSelectedIndex(-1)
      setStatusNote('No live alarm row at this position')
      return
    }

    setSelectedIndex(index)
    setStatusNote(`Live alarm row ${index + 1} selected: ${entry.row.asset}`)
  }

  const acknowledgeSelected = () => {
    if (!selectedRow || selectedEntry === undefined) {
      setStatusNote('No live alarm selected for acknowledgement')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: `Alarm acknowledgement accepted for ${selectedRow.asset}.`,
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = applyTrainingScenarioRuntimeEvent(current, {
        source: 'Monitor 01 Alarms',
        trainId: '317',
        type: 'ALARM_ACKNOWLEDGED',
      })

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          index === selectedEntry.originalIndex ? { ...row, ack: 'Y', tone: 'grey', value: row.value === 'NO ACK' ? 'ACK' : row.value } : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? `Acknowledged selected alarm: ${selectedRow.asset}` : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const acknowledgeAll = () => {
    if (liveRows.length === 0) {
      setStatusNote('No live alarm rows to acknowledge')
      return
    }

    submitBackendScenarioAction(session, updateSession, {
      detail: 'All visible live alarms acknowledged.',
      source: 'Monitor 01 Alarms',
      trainId: '317',
      type: 'ACK_ALARM',
    }, (current) => {
      const guard = applyTrainingScenarioRuntimeEvent(current, {
        source: 'Monitor 01 Alarms',
        trainId: '317',
        type: 'ALARM_ACKNOWLEDGED',
      })

      if (!guard.allowed) {
        return guard.next
      }

      return {
        ...guard.next,
        alarmSummaryRows: current.alarmSummaryRows.map((row, index) => (
          liveRowIndexes.has(index)
            ? {
                ...row,
                ack: 'Y',
                tone: row.tone === 'red' ? 'red' : 'grey',
                value: row.value === 'NO ACK' ? 'ACK' : row.value,
              }
            : row
        )),
      }
    }, (accepted, reason) => {
      setStatusNote(accepted ? 'Acknowledged all visible live alarms' : reason ?? 'Alarm acknowledgement rejected')
    })
  }

  const cycleAlarmFilter = () => {
    const tabs: Array<typeof activeTab> = ['Alarms', 'Events', 'Archives']
    const nextTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length]

    setActiveTab(nextTab)
    setStatusNote(`Filter applied: ${nextTab}`)
  }

  const printAlarmSummary = () => {
    setStatusNote('Print requested for live alarm summary')
    window.print()
  }

  return (
    <ScadaDomSurface
      className="scada-dom-root--alarms"
      title={`${activeTab} | ${statusNote} | ${selectedRow ? selectedRow.asset : 'No live alarm selected'} | ${notAcknowledged} pending`}
    >
      <AlarmCallsHeaderDom
        alarmNotAcknowledged={notAcknowledged}
        alarmTotal={alarmTotal}
        callLog={callLog}
        initialTab="alarms"
        onNavigate={onNavigate}
        onOpenComms={setCommsChannel}
      />
      <StationRibbon top={109} />
      <section className="alarm-dom-panel">
        <div className="alarm-dom-strip">Alarm summary display (filter: none)</div>
        <div className="alarm-dom-tabs" role="tablist">
          {(['Archives', 'Events', 'Alarms'] as const).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'is-active' : ''}
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setStatusNote(`${tab} tab selected`)
              }}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="alarm-dom-controls">
          <label>Total <output>{alarmTotal}</output></label>
          <label>Not Acknowledged <output>{notAcknowledged}</output></label>
          <ScadaDomButton label="Ack. all" onClick={acknowledgeAll} />
          <ScadaDomButton label="Ack. selection" onClick={acknowledgeSelected} />
          <ScadaDomButton label="Unselect alarms" onClick={() => { setSelectedIndex(-1); setStatusNote('Alarm selection cleared') }} />
          <ScadaDomButton label="Help" onClick={() => setStatusNote('Select a live row, then acknowledge or inspect it.')} />
          <ScadaDomButton label="Filter..." onClick={cycleAlarmFilter} />
          <ScadaDomButton label="Print" onClick={printAlarmSummary} />
          <ScadaDomButton label="Close" onClick={() => onNavigate('/')} />
          <label className="alarm-dom-sort">Sort column <output>TIMESTAMP - Descending</output></label>
        </div>
        <div className="alarm-dom-table" role="table">
          <div className="alarm-dom-row alarm-dom-row--head" role="row">
            <span>Ack</span>
            <span>AVL</span>
            <span>MMS</span>
            <span>TIMESTAMP</span>
            <span>ASSET</span>
            <span>DESCRIPTION</span>
            <span>VALUE</span>
          </div>
          {Array.from({ length: 20 }).map((_, index) => {
            const entry = visibleRows[index]

            if (!entry) {
              return <div className="alarm-dom-row alarm-dom-row--empty" key={`empty-${index}`} role="row" />
            }

            const isSelected = liveRows[selectedIndex]?.originalIndex === entry.originalIndex

            return (
              <button
                aria-pressed={isSelected}
                className={`alarm-dom-row alarm-dom-row--data ${rowToneClass(entry.row.tone)} ${isSelected ? 'is-selected' : ''}`}
                key={`${entry.originalIndex}-${entry.row.timestamp}-${entry.row.asset}-${entry.row.description}`}
                onClick={() => selectAlarmRow(index)}
                role="row"
                type="button"
              >
                <span>{entry.row.ack}</span>
                <span>{entry.row.avl}</span>
                <span>{entry.row.mms}</span>
                <span>{entry.row.timestamp}</span>
                <span>{entry.row.asset}</span>
                <span>{entry.row.description}</span>
                <span>{entry.row.value}</span>
              </button>
            )
          })}
          <div className="scada-dom-scrollbar scada-dom-scrollbar--alarm">
            <i />
          </div>
        </div>
        {liveRows.length === 0 ? (
          <div className="alarm-dom-empty">No live alarm rows yet. Confirm a command on Monitor 02 to populate this table.</div>
        ) : null}
        <div className="alarm-dom-status">{statusNote}</div>
      </section>
      {commsChannel && (
        <CommsDialog
          channel={commsChannel}
          onClose={() => setCommsChannel(null)}
          onSend={(request) => updateSession((current) => applyCommsRequest(current, request))}
          selectedTrainId={session.selectedTrainId}
          trainIds={session.trains.map((train) => train.id)}
        />
      )}
      <ScadaFooter active="TRAFFIC" leftMode="Train" status="MNADZRULS" />
    </ScadaDomSurface>
  )
}
