// Trainer and trainee accounts: the rules shared by the sign-in pages and the
// server (server/auth.ts). An admin trainer adds and manages people.

export type UserRole = 'trainer' | 'trainee'

// An account as the server shows it; never includes the password.
export type PublicUser = {
  admin: boolean
  createdAt: string
  disabled: boolean
  // The username people sign in with, lower case.
  id: string
  name: string
  role: UserRole
}

export const PASSWORD_MIN_LENGTH = 8

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

// Returns why the value cannot be used, or null.
export function getUsernameProblem(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value))
    ? null
    : 'Usernames are 2 to 32 letters, digits, dots, dashes or underscores.'
}

export function getPasswordProblem(value: string) {
  return value.length >= PASSWORD_MIN_LENGTH && value.length <= 200
    ? null
    : `Passwords need at least ${PASSWORD_MIN_LENGTH} characters.`
}

export function getDisplayNameProblem(value: string) {
  const trimmed = value.trim()

  return trimmed.length >= 1 && trimmed.length <= 60 ? null : 'Enter a name of up to 60 characters.'
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'trainer' || value === 'trainee'
}
