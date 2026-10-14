import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getDisplayNameProblem, getPasswordProblem, getUsernameProblem, PASSWORD_MIN_LENGTH } from '../accounts'
import AppShell from '../components/AppShell'
import type { PublicUser, UserRole } from '../accounts'
import { apiRequest, authApi } from '../authClient'
import type { AppRoute } from '../types'

type BackupFile = { bytes: number; createdAt: string; name: string }

type PeopleScreenProps = {
  onNavigate: (route: AppRoute) => void
  onSignOut?: () => void
  user: PublicUser
}

// Admin trainers add trainers and trainees, reset passwords and switch
// accounts off. Accounts are never deleted, so past runs keep their names.
function PeopleScreen({ onNavigate, onSignOut, user }: PeopleScreenProps) {
  const [users, setUsers] = useState<PublicUser[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ admin: false, name: '', password: '', role: 'trainee' as UserRole, username: '' })
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [adding, setAdding] = useState(false)

  const refresh = useCallback(() => {
    void authApi.listUsers()
      .then((result) => setUsers(result.users))
      .catch((listError: Error) => setError(listError.message))
  }, [])

  useEffect(refresh, [refresh])

  useEffect(() => {
    void apiRequest<{ backups: BackupFile[] }>('/api/admin/backups').then((result) => setBackups(result.backups)).catch(() => undefined)
  }, [])

  const backUpNow = () => void run(async () => {
    setBackups((await apiRequest<{ backups: BackupFile[] }>('/api/admin/backups', { body: {} })).backups)
  }, 'Backup made.')

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

  const latestBackup = backups[0]

  return (
    <AppShell
      actions={<button type="button" aria-expanded={adding} onClick={() => setAdding((open) => !open)}>Add person</button>}
      active="people"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="people-page"
      title="People"
      user={user}
    >

      {error && <p className="trainer-console-notice is-warning" role="alert">{error}</p>}
      {note && <p className="trainer-console-notice is-success" role="status">{note}</p>}

      {adding && (
        <form className="trainer-console-panel people-add-row" onSubmit={addPerson} aria-label="Add a person">
          <label className="trainer-console-field">
            <span>Name</span>
            <input className="trainer-console-input" onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
          </label>
          <label className="trainer-console-field">
            <span>Username</span>
            <input
              autoCapitalize="none"
              className="trainer-console-input"
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              spellCheck={false}
              value={form.username}
            />
          </label>
          <label className="trainer-console-field">
            <span>Password</span>
            <input autoComplete="new-password" className="trainer-console-input" onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={`${PASSWORD_MIN_LENGTH}+ characters`} value={form.password} />
          </label>
          <label className="trainer-console-field">
            <span>Role</span>
            <select className="trainer-console-input" onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} value={form.role}>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
            </select>
          </label>
          {form.role === 'trainer' && (
            <label className="people-check">
              <input checked={form.admin} onChange={(event) => setForm({ ...form, admin: event.target.checked })} type="checkbox" />
              <span>Admin</span>
            </label>
          )}
          <button type="submit">Add</button>
        </form>
      )}

      <section className="trainer-console-panel" aria-labelledby="people-list-heading">
        <div className="trainer-console-panel-head">
          <h2 id="people-list-heading">Accounts</h2>
          <span>{users.filter((person) => !person.disabled).length} active</span>
        </div>
        <table className="people-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((person) => (
              <tr key={person.id} className={person.disabled ? 'is-disabled' : undefined}>
                <td>{person.name}{person.disabled && <small className="people-off"> · switched off</small>}</td>
                <td>{person.id}</td>
                <td>{person.role === 'trainer' ? (person.admin ? 'Trainer (admin)' : 'Trainer') : 'Trainee'}</td>
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
      </section>

      <section
        className="trainer-console-panel people-backups"
        aria-label="Data backups"
        title="The server copies its data every day to server\data\backups on the host PC. Copy that folder to a USB drive now and then."
      >
        <strong>Backups</strong>
        <span data-testid="latest-backup">
          {latestBackup
            ? `Latest: ${new Date(latestBackup.createdAt).toLocaleString()} (${Math.max(1, Math.round(latestBackup.bytes / 1024))} KB) · daily on the host`
            : 'No backup yet · daily on the host'}
        </span>
        <button type="button" onClick={backUpNow}>Back up now</button>
      </section>
    </AppShell>
  )
}

export default PeopleScreen
