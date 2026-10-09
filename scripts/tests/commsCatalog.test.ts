import assert from 'node:assert/strict'
import {
  applyCommsRequest,
  commsMessages,
  commsRecipients,
  createCommsEvidence,
  getCommsLog,
  hasCommsEvidence,
} from '../../src/comms/commsCatalog'
import { categoriseScenarioEvidence } from '../../src/iosEvidenceTrail'
import { createInitialSession } from '../../src/sessionState'
import { isTrainingScenarioTaskComplete } from '../../src/training-scenarios/assessment'
import { createTrainingScenarioStartSession } from '../../src/trainingScenarios'

// Every message belongs to a known recipient and ids are unique.
assert.equal(new Set(commsMessages.map((message) => message.id)).size, commsMessages.length)
commsMessages.forEach((message) => {
  assert.equal(commsRecipients.some((recipient) => recipient.id === message.recipient), true, message.id)
})

assert.equal(createCommsEvidence({ messageId: 'unknown' }), undefined)

{
  const evidence = createCommsEvidence({ messageId: 'driver-isolate-door', note: 'Car 3 door 2', station: 'SKG', trainId: '317' })

  assert.ok(evidence)
  assert.equal(evidence.result, 'accepted')
  assert.equal(evidence.source, 'Trainee Traffic Controller')
  assert.equal(evidence.action, 'Radio to DRIVER: Isolate the train door in closed position')
  // Driver calls carry the train, not the station.
  assert.equal(evidence.detail, 'Train 317 | Car 3 door 2 | [comms:driver-isolate-door]')
  assert.equal(categoriseScenarioEvidence([evidence])[0].categoryLabel, 'Trainee action')
  // Reports and the IOS show the call without the internal tag.
  assert.equal(categoriseScenarioEvidence([evidence])[0].detail, 'Train 317 | Car 3 door 2')
}

{
  const station = createCommsEvidence({ messageId: 'station-manual-psd', station: 'BGK', trainId: '317' })

  assert.equal(station?.action, 'Telephone to STATION: Authorised manual PSD operation (HW/TW unit or PSL box)')
  assert.equal(station?.detail, 'BGK | [comms:station-manual-psd]')
}

{
  let session = createTrainingScenarioStartSession(createInitialSession(), 'DOOR_FAULT')
  const task = {
    commsMessageIds: ['cc-alert-incident', 'wc-alert-fault'],
    id: 'alert-cc-wc',
    label: 'Alert CC and WC',
    monitor: 'Calls',
    weight: 10,
  }

  assert.equal(isTrainingScenarioTaskComplete(session, task), false)

  session = applyCommsRequest(session, { messageId: 'cc-alert-incident' })
  assert.equal(hasCommsEvidence(session.evidenceLog, 'cc-alert-incident'), true)
  assert.equal(isTrainingScenarioTaskComplete(session, task), false)

  session = applyCommsRequest(session, { messageId: 'wc-alert-fault', note: 'Door 2 car 3' })
  assert.equal(isTrainingScenarioTaskComplete(session, task), true)

  const log = getCommsLog(session.evidenceLog)

  assert.deepEqual(log.map((call) => [call.channel, call.recipient, call.messageId]), [
    ['TELEPHONE', 'WC', 'wc-alert-fault'],
    ['TELEPHONE', 'CC', 'cc-alert-incident'],
  ])
  assert.equal(log[0].detail, 'Door 2 car 3')
  assert.equal(log[1].detail, '')

  // An unknown message leaves the session untouched.
  assert.equal(applyCommsRequest(session, { messageId: 'unknown' }), session)
}
