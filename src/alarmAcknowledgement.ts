import type { AlarmSummaryRow } from './types'

// Fault scenarios raise one alarm that the trainee must find and acknowledge.
// Acknowledging any other row clears that row but earns no scenario credit.

export function hasScenarioAlarm(rows: readonly AlarmSummaryRow[]) {
  return rows.some((row) => row.scenarioAlarm)
}

export function isScenarioAlarmPending(rows: readonly AlarmSummaryRow[]) {
  return rows.some((row) => row.scenarioAlarm && !row.acknowledgedAt)
}

// Sessions without a tagged scenario alarm (older sessions) keep the old rule:
// any acknowledgement counts.
export function acknowledgesScenarioAlarm(rows: readonly AlarmSummaryRow[], indexes: ReadonlySet<number>) {
  if (!hasScenarioAlarm(rows)) {
    return true
  }

  return rows.some((row, index) => indexes.has(index) && row.scenarioAlarm && !row.acknowledgedAt)
}

export function acknowledgeAlarmRows(
  rows: readonly AlarmSummaryRow[],
  indexes: ReadonlySet<number>,
  options: { keepRedTone?: boolean } = {},
): AlarmSummaryRow[] {
  const acknowledgedAt = new Date().toISOString()

  return rows.map((row, index) => (
    indexes.has(index)
      ? {
          ...row,
          ack: 'Y',
          acknowledgedAt: row.acknowledgedAt ?? acknowledgedAt,
          tone: options.keepRedTone && row.tone === 'red' ? 'red' : 'grey',
          value: row.value === 'NO ACK' ? 'ACK' : row.value,
        }
      : row
  ))
}
