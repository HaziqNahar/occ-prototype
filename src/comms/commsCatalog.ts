import { appendScenarioEvidence, createScenarioEvidence } from '../scenario'
import type { OccSessionState, ScenarioEvidence } from '../types'

// Calls and instructions a Traffic Controller gives during an incident, taken
// from the NEL OCC SOPs (train launch, train door faults, PSD faults, 12-car rescue).
// Logged calls become accepted trainee evidence, which scenario tasks score.

export type CommsChannel = 'RADIO' | 'TELEPHONE'

export type CommsRecipientId = 'CC' | 'WC' | 'COC' | 'DTC' | 'CREW' | 'DRIVER' | 'STATION'

export type CommsRecipient = {
  channel: CommsChannel
  id: CommsRecipientId
  label: string
  needsStation?: boolean
  needsTrain?: boolean
}

export type CommsMessage = {
  id: string
  label: string
  recipient: CommsRecipientId
}

export const commsRecipients: readonly CommsRecipient[] = [
  { channel: 'RADIO', id: 'DRIVER', label: 'Train Driver (CSO/ASM on board)', needsTrain: true },
  { channel: 'TELEPHONE', id: 'STATION', label: 'Station Staff (SM/ASM)', needsStation: true },
  { channel: 'TELEPHONE', id: 'CC', label: 'Chief Controller (CC)' },
  { channel: 'TELEPHONE', id: 'WC', label: 'Works Coordinator (WC)' },
  { channel: 'TELEPHONE', id: 'COC', label: 'Communication Controller (CoC)' },
  { channel: 'TELEPHONE', id: 'DTC', label: 'Depot Traffic Controller (DTC)' },
  { channel: 'TELEPHONE', id: 'CREW', label: 'Head Driver / DOM' },
]

export const commsMessages: readonly CommsMessage[] = [
  { id: 'driver-establish-contact', label: 'Establish radio contact', recipient: 'DRIVER' },
  { id: 'driver-investigate', label: 'Investigate the fault and report back', recipient: 'DRIVER' },
  { id: 'driver-cycle-door', label: 'Cycle the train door', recipient: 'DRIVER' },
  { id: 'driver-isolate-door', label: 'Isolate the train door in closed position', recipient: 'DRIVER' },
  { id: 'driver-reset-ehs', label: 'Reset the Emergency Handle Switch (EHS)', recipient: 'DRIVER' },
  { id: 'driver-standby-console', label: 'Standby at leading cab with driving console open', recipient: 'DRIVER' },
  { id: 'driver-standby-osc', label: 'Standby at location until OSC is on board', recipient: 'DRIVER' },
  { id: 'driver-rmf-doors', label: 'Authorised to open/close all train doors in RMF (read back)', recipient: 'DRIVER' },
  { id: 'driver-manual-doors', label: 'Standby at leading cab for manual PSD/train door operation', recipient: 'DRIVER' },
  { id: 'driver-authorise-rm', label: 'Authorised to drive in Restricted Manual (RM)', recipient: 'DRIVER' },
  { id: 'driver-authorise-cm-dirbs', label: 'Authorised CM mode with DIRBS to withdraw train', recipient: 'DRIVER' },
  { id: 'driver-detrain', label: 'Authorised train-to-platform detrainment', recipient: 'DRIVER' },
  { id: 'station-board-investigate', label: 'Board the train and investigate', recipient: 'STATION' },
  { id: 'station-investigate-psd', label: 'Proceed to the affected PSD and investigate', recipient: 'STATION' },
  { id: 'station-isolate-psd-closed', label: 'Authorised to isolate the defective PSD in closed position', recipient: 'STATION' },
  { id: 'station-isolate-psd-open', label: 'Authorised to isolate the defective PSD in open position', recipient: 'STATION' },
  { id: 'station-psd-override', label: 'Authorised to switch the PSD Override Switch to bypass (HW/TW)', recipient: 'STATION' },
  { id: 'station-manual-psd', label: 'Authorised manual PSD operation (HW/TW unit or PSL box)', recipient: 'STATION' },
  { id: 'station-standby-platform', label: 'Standby at the affected platform', recipient: 'STATION' },
  { id: 'station-alert-door-isolation', label: 'Train with door isolation approaching, note affected PSD bound', recipient: 'STATION' },
  { id: 'station-detrain', label: 'Detrain passengers at the platform', recipient: 'STATION' },
  { id: 'cc-alert-incident', label: 'Alert CC of the incident', recipient: 'CC' },
  { id: 'cc-second-check', label: 'Request 2nd level check for RM movement', recipient: 'CC' },
  { id: 'cc-update', label: 'Update CC on recovery progress', recipient: 'CC' },
  { id: 'wc-alert-fault', label: 'Alert WC of the fault', recipient: 'WC' },
  { id: 'wc-engineering-support', label: 'Request engineering support', recipient: 'WC' },
  { id: 'coc-passenger-info', label: 'Disseminate service information to passengers', recipient: 'COC' },
  { id: 'coc-platform-cctv', label: 'Check the platform CCTV', recipient: 'COC' },
  { id: 'dtc-despatch', label: 'Coordinate train despatch from depot', recipient: 'DTC' },
  { id: 'dtc-reception-track', label: 'Confirm train status at reception track', recipient: 'DTC' },
  { id: 'crew-driver-deployment', label: 'Arrange train driver deployment', recipient: 'CREW' },
]

export const commsStations = [
  'HBF', 'OTP', 'CNT', 'CQY', 'DBG', 'LTI', 'FRP', 'BNK', 'PTP',
  'WLH', 'SER', 'KVN', 'HGN', 'BGK', 'SKG', 'PGL', 'PGC',
] as const

export type CommsRequest = {
  messageId: string
  note?: string
  station?: string
  trainId?: string
}

export type CommsLogEntry = {
  channel: CommsChannel
  detail: string
  id: string
  label: string
  messageId: string
  recipient: CommsRecipientId
  time: string
}

const COMMS_SOURCE = 'Trainee Traffic Controller'
const COMMS_TAG = /\[comms:([a-z0-9-]+)\]/

export function getCommsRecipient(id: CommsRecipientId) {
  return commsRecipients.find((recipient) => recipient.id === id) ?? commsRecipients[0]
}

export function getCommsMessagesFor(recipient: CommsRecipientId) {
  return commsMessages.filter((message) => message.recipient === recipient)
}

export function getCommsMessage(id: string) {
  return commsMessages.find((message) => message.id === id)
}

export function createCommsEvidence(request: CommsRequest): ScenarioEvidence | undefined {
  const message = getCommsMessage(request.messageId)

  if (!message) {
    return undefined
  }

  const recipient = getCommsRecipient(message.recipient)
  const target = [
    recipient.needsTrain && request.trainId ? `Train ${request.trainId}` : '',
    recipient.needsStation && request.station ? request.station : '',
  ].filter(Boolean).join(' ')
  const note = request.note?.trim()

  return createScenarioEvidence(
    COMMS_SOURCE,
    `${recipient.channel === 'RADIO' ? 'Radio' : 'Telephone'} to ${recipient.id}: ${message.label}`,
    'accepted',
    [target, note, `[comms:${message.id}]`].filter(Boolean).join(' | '),
  )
}

export function applyCommsRequest(current: OccSessionState, request: CommsRequest): OccSessionState {
  const evidence = createCommsEvidence(request)

  if (!evidence) {
    return current
  }

  return {
    ...current,
    evidenceLog: appendScenarioEvidence(current.evidenceLog, evidence),
  }
}

export function getCommsMessageId(evidence: ScenarioEvidence) {
  return evidence.result === 'accepted' ? COMMS_TAG.exec(evidence.detail)?.[1] : undefined
}

// Display text for an evidence detail, without the internal comms tag.
export function formatEvidenceDetail(detail: string) {
  return detail.replace(COMMS_TAG, '').replace(/\s*\|\s*$/, '')
}

export function hasCommsEvidence(evidenceLog: readonly ScenarioEvidence[], messageId: string) {
  return evidenceLog.some((evidence) => getCommsMessageId(evidence) === messageId)
}

export function getCommsLog(evidenceLog: readonly ScenarioEvidence[]): CommsLogEntry[] {
  return evidenceLog.flatMap((evidence) => {
    const messageId = getCommsMessageId(evidence)
    const message = messageId ? getCommsMessage(messageId) : undefined

    if (!message) {
      return []
    }

    return [{
      channel: getCommsRecipient(message.recipient).channel,
      detail: formatEvidenceDetail(evidence.detail),
      id: evidence.id,
      label: message.label,
      messageId: message.id,
      recipient: message.recipient,
      time: evidence.time,
    }]
  })
}
