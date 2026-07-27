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

export function categoriseScenarioEvidence(evidenceLog: ScenarioEvidence[]): CategorisedScenarioEvidence[] {
  return evidenceLog.map((evidence) => {
    const category = getEvidenceCategory(evidence)

    return {
      ...evidence,
      category,
      categoryLabel: getEvidenceCategoryLabel(category),
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
