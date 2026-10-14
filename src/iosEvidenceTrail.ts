import { formatEvidenceDetail } from './comms/commsCatalog'
import type { ScenarioEvidence } from './types'

export type IosEvidenceCategory = 'trainee' | 'trainer' | 'system' | 'milestone'

export type CategorisedScenarioEvidence = ScenarioEvidence & {
  category: IosEvidenceCategory
  categoryLabel: string
}

const milestonePatterns = [
  'arrival time',
  'departure time',
  'destination',
  'endpoint',
  'route',
  'selected',
  'train selected',
]

const systemPatterns = [
  'blocked',
  'rejected',
  'validator',
  'wrong',
  'missing',
  'cannot',
  'not granted',
  'not allowed',
]

const trainerPatterns = [
  'IOS Scenario Runtime',
  'IOS',
  'Session Lobby',
  'Scenario Builder',
]

const traineeSourcePatterns = [
  'Line Map Train Control',
  'Monitor 01 Alarms',
  'Monitor 02 Line Map',
  'Monitor 03 Timetable',
]

function includesAny(value: string, patterns: string[]) {
  const normalized = value.toLowerCase()

  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
}

export function getEvidenceCategory(evidence: ScenarioEvidence): IosEvidenceCategory {
  const joinedText = `${evidence.source} ${evidence.action} ${evidence.detail}`

  if (evidence.result === 'rejected' || includesAny(joinedText, systemPatterns)) {
    return 'system'
  }

  if (
    evidence.source.startsWith('Trainee ')
    || traineeSourcePatterns.includes(evidence.source)
    || includesAny(joinedText, ['trainee joined'])
  ) {
    return 'trainee'
  }

  if (includesAny(joinedText, milestonePatterns)) {
    return 'milestone'
  }

  if (trainerPatterns.some((source) => evidence.source === source)) {
    return 'trainer'
  }

  return 'system'
}

export function getEvidenceCategoryLabel(category: IosEvidenceCategory) {
  switch (category) {
    case 'trainee':
      return 'Trainee action'
    case 'trainer':
      return 'Trainer action'
    case 'milestone':
      return 'Scenario milestone'
    default:
      return 'System validation'
  }
}

// Stored evidence sources, as trainers read them. The stored values drive the
// categories above, so they are only renamed for display.
const SOURCE_LABELS: Record<string, string> = {
  IOS: 'Trainer Console',
  'IOS Scenario Control': 'Trainer Console',
  'IOS Scenario Runtime': 'Trainer Console',
  'Scenario Guard': 'Scenario check',
  'Trainee Traffic Controller': 'Calls panel',
}

export function getEvidenceSourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source
}

// Who did it: the person when the server recorded one, otherwise where it came from.
export function getEvidenceWhoLabel(evidence: Pick<ScenarioEvidence, 'actor' | 'source'>) {
  return evidence.actor || getEvidenceSourceLabel(evidence.source)
}

// "Action: detail", without a dangling colon when there is no detail.
export function formatEvidenceLine(evidence: Pick<ScenarioEvidence, 'action' | 'detail'>) {
  const detail = formatEvidenceDetail(evidence.detail).trim()

  return detail ? `${evidence.action}: ${detail}` : evidence.action
}

export function categoriseScenarioEvidence(evidenceLog: ScenarioEvidence[]): CategorisedScenarioEvidence[] {
  return evidenceLog.map((evidence) => {
    const category = getEvidenceCategory(evidence)

    return {
      ...evidence,
      category,
      // A refused action is the trainee's, even though the system recorded it.
      categoryLabel: evidence.result === 'rejected' ? 'Refused action' : getEvidenceCategoryLabel(category),
      detail: formatEvidenceDetail(evidence.detail),
    }
  })
}

export function groupScenarioEvidenceByCategory(evidenceLog: ScenarioEvidence[]) {
  const categorised = categoriseScenarioEvidence(evidenceLog)

  return {
    milestone: categorised.filter((evidence) => evidence.category === 'milestone'),
    system: categorised.filter((evidence) => evidence.category === 'system'),
    trainee: categorised.filter((evidence) => evidence.category === 'trainee'),
    trainer: categorised.filter((evidence) => evidence.category === 'trainer'),
  }
}
