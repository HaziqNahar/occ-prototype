import assert from 'node:assert/strict'
import {
  categoriseScenarioEvidence,
  getEvidenceCategory,
  groupScenarioEvidenceByCategory,
} from '../../src/iosEvidenceTrail'
import type { ScenarioEvidence } from '../../src/types'

function evidence(
  source: string,
  action: string,
  detail: string,
  result: ScenarioEvidence['result'] = 'info',
): ScenarioEvidence {
  return {
    action,
    detail,
    id: `${source}-${action}-${detail}`,
    result,
    source,
    time: '05/11 11:00:00',
  }
}

{
  assert.equal(
    getEvidenceCategory(evidence('Trainee Traffic Controller', 'Opened monitor', 'Line Map opened')),
    'trainee',
  )
  assert.equal(
    getEvidenceCategory(evidence('Session Lobby', 'Trainee joined', 'Traffic Controller joined')),
    'trainee',
  )
}

{
  assert.equal(
    getEvidenceCategory(evidence('Monitor 02 Line Map', 'Route rejected', 'Cannot set conflicting route', 'rejected')),
    'system',
  )
}

{
  assert.equal(
    getEvidenceCategory(evidence('Monitor 03 Timetable', 'Train selected', 'Train 301 selected for launch')),
    'trainee',
  )
  assert.equal(
    getEvidenceCategory(evidence('Line Map Train Control', 'Set arrival time', 'Destination NED RT2D')),
    'trainee',
  )
  assert.equal(
    getEvidenceCategory(evidence('Timetable Playback', 'Train reached endpoint', 'Destination PGC')),
    'milestone',
  )
}

{
  assert.equal(
    getEvidenceCategory(evidence('IOS Scenario Runtime', 'Scenario armed', 'Train withdrawal armed')),
    'trainer',
  )
}

{
  const evidenceLog = [
    evidence('Trainee Traffic Controller', 'Opened monitor', 'Line Map opened'),
    evidence('IOS Scenario Runtime', 'Scenario armed', 'Train withdrawal armed'),
    evidence('Monitor 02 Line Map', 'Route rejected', 'Cannot set conflicting route', 'rejected'),
    evidence('Monitor 03 Timetable', 'Train selected', 'Train 301 selected for launch'),
    evidence('Timetable Playback', 'Train reached endpoint', 'Destination PGC'),
  ]
  const categorised = categoriseScenarioEvidence(evidenceLog)
  const grouped = groupScenarioEvidenceByCategory(evidenceLog)

  assert.deepEqual(categorised.map((row) => row.category), ['trainee', 'trainer', 'system', 'trainee', 'milestone'])
  assert.equal(grouped.trainee.length, 2)
  assert.equal(grouped.trainer.length, 1)
  assert.equal(grouped.system.length, 1)
  assert.equal(grouped.milestone.length, 1)
}
