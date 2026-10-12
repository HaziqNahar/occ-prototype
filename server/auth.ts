import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { OccDatabase } from './database'
import { RequestError } from './http'
import {
  getDisplayNameProblem,
  getPasswordProblem,
  getUsernameProblem,
  isUserRole,
  normalizeUsername,
} from '../src/accounts'
import type { PublicUser, UserRole } from '../src/accounts'

// Accounts and sign-in. Passwords are stored as scrypt hashes; a sign-in gives
// the browser a random token, of which only a SHA-256 hash is stored.

const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const MAX_FAILED_SIGN_INS = 5
const LOCKOUT_MS = 30_000
const SCRYPT_KEY_LENGTH = 64

function scrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)

  return `scrypt$${salt.toString('base64')}$${(await scrypt(password, salt)).toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')

  if (scheme !== 'scrypt' || !salt || !hash) {
    return false
  }

  const expected = Buffer.from(hash, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'))

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function check(problem: string | null) {
  if (problem) {
    throw new RequestError(problem)
  }
}

export type NewAccount = {
  admin?: boolean
  id: string
  name: string
  password: string
  role: UserRole
}

export class AuthService {
  private readonly db: OccDatabase
  private readonly failures = new Map<string, { count: number; lockedUntil: number }>()

  constructor(db: OccDatabase) {
    this.db = db
    db.deleteExpiredTokens()
  }

  needsSetup() {
    return this.db.countUsers() === 0
  }

  // The first account: an admin trainer. Only possible while there are no accounts.
  async setup(account: Omit<NewAccount, 'admin' | 'role'>) {
    if (!this.needsSetup()) {
      throw new RequestError('The first trainer has already been set up. Sign in instead.', 409)
    }

    const user = await this.createAccount({ ...account, admin: true, role: 'trainer' })

    return { token: this.issueToken(user.id), user }
  }

  async signIn(username: string, password: string) {
    const id = normalizeUsername(username)
    const failure = this.failures.get(id)

    if (failure && failure.lockedUntil > Date.now()) {
      throw new RequestError('Too many wrong passwords. Wait 30 seconds and try again.', 429)
    }

    const stored = this.db.getUser(id)
    const valid = stored ? await verifyPassword(password, stored.passwordHash) : false

    if (!stored || !valid || stored.user.disabled) {
      const count = (failure?.count ?? 0) + 1

      this.failures.set(id, { count, lockedUntil: count >= MAX_FAILED_SIGN_INS ? Date.now() + LOCKOUT_MS : 0 })
      throw new RequestError(
        stored?.user.disabled && valid ? 'This account is switched off. Ask an admin trainer.' : 'Wrong username or password.',
        401,
      )
    }

    this.failures.delete(id)

    return { token: this.issueToken(id), user: stored.user }
  }

  signOut(token: string) {
    this.db.deleteToken(hashToken(token))
  }

  authenticate(token: string | null | undefined): PublicUser | null {
    return token ? this.db.findTokenUser(hashToken(token)) : null
  }

  listUsers() {
    return this.db.listUsers()
  }

  async createAccount(account: NewAccount) {
    const id = normalizeUsername(account.id)

    check(getUsernameProblem(id))
    check(getDisplayNameProblem(account.name))
    check(getPasswordProblem(account.password))

    if (!isUserRole(account.role)) {
      throw new RequestError('Role must be trainer or trainee.')
    }

    if (this.db.getUser(id)) {
      throw new RequestError(`The username ${id} is already taken.`, 409)
    }

    this.db.insertUser({ admin: account.role === 'trainer' && account.admin === true, id, name: account.name.trim(), role: account.role }, await hashPassword(account.password))

    return this.db.getUser(id)!.user
  }

  // Admin changes to an account. A new password or switching an account off
  // signs it out everywhere. Admins cannot lock themselves out.
  async updateAccount(admin: PublicUser, id: string, changes: { admin?: boolean; disabled?: boolean; name?: string; password?: string }) {
    const stored = this.db.getUser(normalizeUsername(id))

    if (!stored) {
      throw new RequestError('No such account.', 404)
    }

    const user = stored.user

    if (changes.name !== undefined) {
      check(getDisplayNameProblem(changes.name))
    }

    if (changes.password !== undefined) {
      check(getPasswordProblem(changes.password))
    }

    if (user.id === admin.id && (changes.disabled === true || changes.admin === false)) {
      throw new RequestError('You cannot switch off your own account or your own admin rights.')
    }

    if (changes.admin === true && user.role !== 'trainer') {
      throw new RequestError('Only trainers can be admins.')
    }

    this.db.updateUser(user.id, {
      admin: changes.admin,
      disabled: changes.disabled,
      name: changes.name?.trim(),
      passwordHash: changes.password === undefined ? undefined : await hashPassword(changes.password),
    })

    if (changes.password !== undefined || changes.disabled === true) {
      this.db.deleteUserTokens(user.id)
    }

    return this.db.getUser(user.id)!.user
  }

  private issueToken(userId: string) {
    const token = randomBytes(32).toString('base64url')

    this.db.insertToken(hashToken(token), userId, new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString())

    return token
  }
}
