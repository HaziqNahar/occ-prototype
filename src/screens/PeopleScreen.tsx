import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { getDisplayNameProblem, getPasswordProblem, getUsernameProblem, PASSWORD_MIN_LENGTH } from '../accounts'
import type { PublicUser, UserRole } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { authApi } from '../authClient'
import type { AppRoute } from '../types'

type PeopleScreenProps = {
  onNavigate: (route: AppRoute) => void
  user: PublicUser
}

// Admin trainers add trainers and trainees, reset passwords and switch
// accounts off. Accounts are never deleted, so past runs keep their names.
function PeopleScreen({ onNavigate, user }: PeopleScreenProps) {
  const [users, setUsers] = useState<PublicUser[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ admin: false, name: '', password: '', role: 'trainee' as UserRole, username: '' })

  const refresh = useCallback(() => {
    void authApi.listUsers()
      .then((result) => setUsers(result.users))
      .catch((listError: Error) => setError(listError.message))
  }, [])

  useEffect(refresh, [refresh])

  const run = async (action: () => Promise<unknown>, done: string) => {
    setError('')
    setNote('')

    try {
      await action()
      setNote(done)
      refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'That did not work.')
    }
  }

  const addPerson = (event: FormEvent) => {
    event.preventDefault()

    const problem = getDisplayNameProblem(form.name) ?? getUsernameProblem(form.username) ?? getPasswordProblem(form.password)

    if (problem) {
      setError(problem)
      return
    }

    void run(async () => {
      await authApi.createUser({ ...form, admin: form.role === 'trainer' && form.admin })
      setForm({ admin: false, name: '', password: '', role: form.role, username: '' })
    }, `${form.name.trim()} added. Give them their username and password.`)
  }

  const resetPassword = (person: PublicUser) => {
    const password = window.prompt(`New password for ${person.name} (at least ${PASSWORD_MIN_LENGTH} characters):`)

    if (password === null) {
      return
    }

    const problem = getPasswordProblem(password)

    if (problem) {
      setError(problem)
      return
    }

    void run(() => authApi.updateUser(person.id, { password }), `Password for ${person.name} changed. They are signed out everywhere.`)
  }

  return (
    <main className="trainee-shell people-shell" style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}>
      <section className="trainee-card people-card" aria-labelledby="people-title">
        <header className="start-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>Signed in as {user.name} (admin)</p>
            <h1 id="people-title">People</h1>
          </div>
        </header>

        <table className="people-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((person) => (
              <tr key={person.id} className={person.disabled ? 'is-disabled' : undefined}>
                <td>{person.name}</td>
                <td>{person.id}</td>
                <td>{person.role}{person.admin ? ' (admin)' : ''}</td>
                <td>{person.disabled ? 'Switched off' : 'Active'}</td>
                <td className="people-actions">
                  <button type="button" onClick={() => resetPassword(person)}>Reset password</button>
                  {person.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => void run(
                        () => authApi.updateUser(person.id, { disabled: !person.disabled }),
                        `${person.name} ${person.disabled ? 'switched on' : 'switched off'}.`,
                      )}
                    >
                      {person.disabled ? 'Switch on' : 'Switch off'}
                    </button>
                  )}
                  {person.role === 'trainer' && person.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => void run(
                        () => authApi.updateUser(person.id, { admin: !person.admin }),
                        `${person.name} ${person.admin ? 'is no longer an admin' : 'is now an admin'}.`,
                      )}
                    >
                      {person.admin ? 'Remove admin' : 'Make admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="trainee-join people-add" onSubmit={addPerson} aria-label="Add a person">
          <h2>Add a person</h2>
          <label>
            <span>Name</span>
            <input onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
          </label>
          <label>
            <span>Username</span>
            <input
              autoCapitalize="none"
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              spellCheck={false}
              value={form.username}
            />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="new-password" onChange={(event) => setForm({ ...form, password: event.target.value })} value={form.password} />
          </label>
          <label>
            <span>Role</span>
            <select onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} value={form.role}>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
            </select>
          </label>
          {form.role === 'trainer' && (
            <label className="people-check">
              <input checked={form.admin} onChange={(event) => setForm({ ...form, admin: event.target.checked })} type="checkbox" />
              <span>Admin (can manage people)</span>
            </label>
          )}
          {error && <p className="trainee-error" role="alert">{error}</p>}
          {note && <p className="sign-in-note" role="status">{note}</p>}
          <button type="submit">Add person</button>
        </form>

        <button type="button" className="trainee-leave" onClick={() => onNavigate('/ios/modules')}>Back to the Trainer Console</button>
      </section>
    </main>
  )
}

export default PeopleScreen
