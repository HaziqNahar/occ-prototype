// Short join codes the trainer reads out to trainees, e.g. "K7M2".
// Letters and digits that are easy to confuse aloud or on screen (I, L, O, 0, 1) are left out.
// The server uses this module too.
export const SESSION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const SESSION_CODE_LENGTH = 4

export function createSessionCode(random: () => number = Math.random) {
  return Array.from({ length: SESSION_CODE_LENGTH }, () => (
    SESSION_CODE_ALPHABET[Math.min(SESSION_CODE_ALPHABET.length - 1, Math.floor(random() * SESSION_CODE_ALPHABET.length))]
  )).join('')
}

const SESSION_CODE_PATTERN = new RegExp(`^[${SESSION_CODE_ALPHABET}]{${SESSION_CODE_LENGTH}}$`)

// Sessions saved before short codes used OCC-TRAINING-001; they stay joinable until reset.
export function isSessionCode(code: unknown): code is string {
  return typeof code === 'string' && (SESSION_CODE_PATTERN.test(code) || code.startsWith('OCC-TRAINING-'))
}

// Trainees may type the code in lower case or with spaces.
export function normalizeEnteredSessionCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function sessionCodesMatch(entered: string, sessionCode: string) {
  return normalizeEnteredSessionCode(entered) === normalizeEnteredSessionCode(sessionCode)
}

// A session's id is stable for its lifetime: a reset creates a new session.
export function getSessionId(session: { sessionMeta: { code: string; createdAt: string } }) {
  return `${session.sessionMeta.code}-${session.sessionMeta.createdAt}`
}
