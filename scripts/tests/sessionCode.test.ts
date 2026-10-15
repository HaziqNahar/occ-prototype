import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { nelTimetableOptions } from '../../src/data/nelTimetable'
import {
  SESSION_CODE_ALPHABET,
  createSessionCode,
  isSessionCode,
  normalizeEnteredSessionCode,
  sessionCodesMatch,
} from '../../src/sessionCode'
import { createInitialSession, createResetSessionState } from '../../src/sessionState'
import { startBackend, stopBackend, testTrainee, testTrainer } from './support/backend'

// Codes are four characters from an alphabet without look-alikes.
for (let index = 0; index < 200; index += 1) {
  assert.match(createSessionCode(), /^[A-Z2-9]{4}$/)
}
assert.equal([...'ILO01'].some((character) => SESSION_CODE_ALPHABET.includes(character)), false)
assert.equal(createSessionCode(() => 0), 'AAAA')
assert.equal(createSessionCode(() => 0.999999), '9999')
assert.equal(normalizeEnteredSessionCode(' k7 m2 '), 'K7M2')
assert.equal(sessionCodesMatch('k7m2', 'K7M2'), true)
assert.equal(sessionCodesMatch('K7M3', 'K7M2'), false)
assert.equal(sessionCodesMatch('', 'K7M2'), false)

// Sessions saved before short codes keep their old code until reset.
assert.equal(isSessionCode('OCC-TRAINING-001'), true)

// A new or reset session gets its own code.
assert.match(createInitialSession().sessionMeta.code, /^[A-Z2-9]{4}$/)
assert.match(createResetSessionState('PRACTICE', 1, 2).sessionMeta.code, /^[A-Z2-9]{4}$/)

// The server keeps its code through every command and issues a new one only on reset.
{
  const dataDir = await mkdtemp(path.join(tmpdir(), 'occ-session-code-'))
  const server = await startBackend(dataDir)

  try {
    const first = await server.snapshot()
    const code = first.session.sessionMeta.code
    const otherTimetable = nelTimetableOptions.find((option) => option.value !== first.session.timetableName)!.value

    assert.match(code, /^[A-Z2-9]{4}$/)

    await server.command(testTrainee, { code, type: 'TRAINEE_JOIN' })

    // Loading on another timetable rebuilds the trains but keeps the class's code.
    await server.command(testTrainer, {
      duration: '06:00',
      incident: 'Train launch',
      kind: 'TRAIN_LAUNCH',
      timetableName: otherTimetable,
      trainingMode: 'PRACTICE',
      type: 'LOAD_SCENARIO',
    })

    const loaded = await server.snapshot()

    assert.equal(loaded.session.timetableName, otherTimetable)
    assert.equal(loaded.session.sessionMeta.code, code)
    assert.equal(loaded.sessionId, first.sessionId)

    await server.command(testTrainer, { timetableName: otherTimetable, trainingMode: 'PRACTICE', type: 'RESET_SESSION' })

    const reset = await server.snapshot()

    assert.notEqual(reset.session.sessionMeta.code, code)
    assert.match(reset.session.sessionMeta.code, /^[A-Z2-9]{4}$/)
  } finally {
    await stopBackend(server.backend)
    await rm(dataDir, { force: true, recursive: true })
  }
}
