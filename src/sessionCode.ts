// Short join codes the trainer reads out to trainees, e.g. "K7M2".
// Letters and digits that are easy to confuse aloud or on screen (I, L, O, 0, 1) are left out.
// server/server.mjs generates codes with the same alphabet.
export const SESSION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const SESSION_CODE_LENGTH = 4

export function createSessionCode(random: () => number = Math.random) {
  return Array.from({ length: SESSION_CODE_LENGTH }, () => (
    SESSION_CODE_ALPHABET[Math.min(SESSION_CODE_ALPHABET.length - 1, Math.floor(random() * SESSION_CODE_ALPHABET.length))]
  )).join('')
}

// Trainees may type the code in lower case or with spaces.
export function normalizeEnteredSessionCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function sessionCodesMatch(entered: string, sessionCode: string) {
  return normalizeEnteredSessionCode(entered) === normalizeEnteredSessionCode(sessionCode)
}
