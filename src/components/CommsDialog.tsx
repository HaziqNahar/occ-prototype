import { useState } from 'react'
import {
  commsRecipients,
  commsStations,
  getCommsMessagesFor,
  getCommsRecipient,
} from '../comms/commsCatalog'
import type { CommsChannel, CommsRecipientId, CommsRequest } from '../comms/commsCatalog'
import usePopupDrag from './train-control/usePopupDrag'

type CommsDialogProps = {
  channel: CommsChannel
  onClose: () => void
  onSend: (request: CommsRequest) => void
  selectedTrainId?: string
  trainIds: readonly string[]
}

function CommsDialog({ channel, onClose, onSend, selectedTrainId, trainIds }: CommsDialogProps) {
  const popupDrag = usePopupDrag()
  const [recipientId, setRecipientId] = useState<CommsRecipientId>(
    commsRecipients.find((recipient) => recipient.channel === channel)?.id ?? 'DRIVER',
  )
  const recipient = getCommsRecipient(recipientId)
  const messages = getCommsMessagesFor(recipientId)
  const [messageId, setMessageId] = useState(messages[0]?.id ?? '')
  const [trainId, setTrainId] = useState(selectedTrainId ?? trainIds[0] ?? '')
  const [station, setStation] = useState<string>('SKG')
  const [note, setNote] = useState('')
  const [lastSent, setLastSent] = useState('')
  const activeMessageId = messages.some((message) => message.id === messageId) ? messageId : messages[0]?.id ?? ''

  const send = () => {
    if (!activeMessageId) {
      return
    }

    onSend({
      messageId: activeMessageId,
      note,
      station: recipient.needsStation ? station : undefined,
      trainId: recipient.needsTrain ? trainId : undefined,
    })
    setLastSent(messages.find((message) => message.id === activeMessageId)?.label ?? '')
    setNote('')
  }

  return (
    <div
      aria-label="OCC communications"
      className="line-map-popup-window comms-dialog"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      style={{ left: 330, top: 118, width: 560, ...popupDrag.style }}
    >
      <div className="line-map-popup-titlebar" {...popupDrag.titleBarProps}>
        <span>{recipient.channel === 'RADIO' ? 'Radio Call' : 'Telephone Call'} : OCC Traffic Controller</span>
      </div>
      <div className="line-map-command-body comms-dialog-body">
        <label className="comms-dialog-field">
          <span>Call to</span>
          <select
            value={recipientId}
            onChange={(event) => {
              const nextRecipient = event.target.value as CommsRecipientId
              setRecipientId(nextRecipient)
              setMessageId(getCommsMessagesFor(nextRecipient)[0]?.id ?? '')
              setLastSent('')
            }}
          >
            {commsRecipients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.channel === 'RADIO' ? 'Radio' : 'Teleph.'} - {item.label}
              </option>
            ))}
          </select>
        </label>
        {recipient.needsTrain && (
          <label className="comms-dialog-field">
            <span>Train</span>
            <select value={trainId} onChange={(event) => setTrainId(event.target.value)}>
              {trainIds.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
        )}
        {recipient.needsStation && (
          <label className="comms-dialog-field">
            <span>Station</span>
            <select value={station} onChange={(event) => setStation(event.target.value)}>
              {commsStations.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
        )}
        <label className="comms-dialog-field">
          <span>Message</span>
          <select value={activeMessageId} onChange={(event) => { setMessageId(event.target.value); setLastSent('') }}>
            {messages.map((message) => <option key={message.id} value={message.id}>{message.label}</option>)}
          </select>
        </label>
        <label className="comms-dialog-field">
          <span>Remarks</span>
          <input
            maxLength={120}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
            value={note}
          />
        </label>
        <label className="line-map-popup-status">
          <span>Status</span>
          <output>{lastSent ? `Logged: ${lastSent}` : 'Ready'}</output>
        </label>
        <div className="line-map-popup-actions line-map-popup-actions--right">
          <button type="button" disabled={!activeMessageId} onClick={send}>Send</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default CommsDialog
