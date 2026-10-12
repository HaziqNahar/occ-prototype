import { hashPassword } from './auth'
import { OccDatabase } from './database'
import { getPasswordProblem, normalizeUsername } from '../src/accounts'

// Sets a new password for an account and switches it back on, signing it out
// everywhere. For an admin who cannot sign in. Run on the host PC:
//   npm.cmd run reset:password -- <username> <new password>

export async function resetPassword(args: readonly string[]) {
  const [username, password] = args

  if (!username || !password) {
    throw new Error('Usage: npm.cmd run reset:password -- <username> <new password>')
  }

  const problem = getPasswordProblem(password)

  if (problem) {
    throw new Error(problem)
  }

  const db = new OccDatabase()

  try {
    const id = normalizeUsername(username)
    const stored = db.getUser(id)

    if (!stored) {
      throw new Error(`No account called ${id}. Existing accounts: ${db.listUsers().map((user) => user.id).join(', ') || 'none'}.`)
    }

    db.updateUser(id, { disabled: false, passwordHash: await hashPassword(password) })
    db.deleteUserTokens(id)
    db.logAction({ actor: 'host PC', detail: `${id}: password reset from the command line`, kind: 'account.updated' })

    return `Password for ${stored.user.name} (${id}) changed. The account is switched on.`
  } finally {
    db.close()
  }
}
