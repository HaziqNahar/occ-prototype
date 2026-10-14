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
  // The side panel: adding a person, or a new password for one.
  const [panel, setPanel] = useState<{ kind: 'add' } | { kind: 'reset'; person: PublicUser } | null>(null)
  const [panelError, setPanelError] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const openPanel = (next: typeof panel) => {
    setPanel(next)
    setPanelError('')
    setNewPassword('')
  }

  useEffect(() => {
    if (!panel) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanel(null) }

    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [panel])

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
      setPanelError(problem)
      return
    }

    setPanelError('')
    void authApi.createUser({ ...form, admin: form.role === 'trainer' && form.admin })
      .then(() => {
        setNote(`${form.name.trim()} added. Give them their username and password.`)
        setError('')
        setForm({ admin: false, name: '', password: '', role: form.role, username: '' })
        setPanel(null)
        refresh()
      })
      .catch((addError: Error) => setPanelError(addError.message))
  }

  const resetPassword = (event: FormEvent, person: PublicUser) => {
    event.preventDefault()

    const problem = getPasswordProblem(newPassword)

    if (problem) {
      setPanelError(problem)
      return
    }

    void authApi.updateUser(person.id, { password: newPassword })
      .then(() => {
        setNote(`Password for ${person.name} changed. They are signed out everywhere.`)
        setError('')
        setPanel(null)
      })
      .catch((resetError: Error) => setPanelError(resetError.message))
  }

  const latestBackup = backups[0]

  return (
    <AppShell
      actions={<button type="button" className="is-primary" onClick={() => openPanel({ kind: 'add' })}>Add person</button>}
      active="people"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      pageClassName="people-page"
      title="People"
      user={user}
    >

      {error && <p className="trainer-console-notice is-warning" role="alert">{error}</p>}
      {note && <p className="trainer-console-notice is-success" role="status">{note}</p>}

      {panel && (
        <div className="side-panel-backdrop" onClick={() => setPanel(null)}>
          <aside
            aria-labelledby="side-panel-title"
            aria-modal="true"
            className="side-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            {panel.kind === 'add' ? (
              <form className="side-panel-form" onSubmit={addPerson}>
                <header>
                  <h2 id="side-panel-title">Add person</h2>
                  <button type="button" className="side-panel-close" aria-label="Close" onClick={() => setPanel(null)}>×</button>
                </header>
                <div className="segmented" role="radiogroup" aria-label="Role">
                  {(['trainee', 'trainer'] as const).map((role) => (
                    <button
                      aria-checked={form.role === role}
                      className={form.role === role ? 'is-active' : undefined}
                      key={role}
                      onClick={() => setForm({ ...form, role })}
                      role="radio"
                      type="button"
                    >
                      {role === 'trainee' ? 'Trainee' : 'Trainer'}
                    </button>
                  ))}
                </div>
                <label className="side-panel-field">
                  <span>Full name</span>
                  <input autoFocus onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Aisyah Rahman" value={form.name} />
                </label>
                <label className="side-panel-field">
                  <span>Username</span>
                  <input
                    autoCapitalize="none"
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
                    placeholder="e.g. aisyah"
                    spellCheck={false}
                    value={form.username}
                  />
                </label>
                <label className="side-panel-field">
                  <span>Password</span>
                  <input autoComplete="new-password" onChange={(event) => setForm({ ...form, password: event.target.value })} value={form.password} />
                  <small>At least {PASSWORD_MIN_LENGTH} characters. Give it to them in person.</small>
                </label>
                {form.role === 'trainer' && (
                  <label className="side-panel-switch">
                    <input checked={form.admin} onChange={(event) => setForm({ ...form, admin: event.target.checked })} type="checkbox" />
                    <span>
                      <strong>Admin</strong>
                      <small>Can add people and reset passwords.</small>
                    </span>
                  </label>
                )}
                {panelError && <p className="side-panel-error" role="alert">{panelError}</p>}
                <footer>
                  <button type="button" onClick={() => setPanel(null)}>Cancel</button>
                  <button type="submit" className="is-primary">Add person</button>
                </footer>
              </form>
            ) : (
              <form className="side-panel-form" onSubmit={(event) => resetPassword(event, panel.person)}>
                <header>
                  <h2 id="side-panel-title">Reset password</h2>
                  <button type="button" className="side-panel-close" aria-label="Close" onClick={() => setPanel(null)}>×</button>
                </header>
                <p className="side-panel-lead">{panel.person.name} · {panel.person.id}</p>
                <label className="side-panel-field">
                  <span>New password</span>
                  <input autoComplete="new-password" autoFocus onChange={(event) => setNewPassword(event.target.value)} value={newPassword} />
                  <small>At least {PASSWORD_MIN_LENGTH} characters. They are signed out everywhere.</small>
                </label>
                {panelError && <p className="side-panel-error" role="alert">{panelError}</p>}
                <footer>
                  <button type="button" onClick={() => setPanel(null)}>Cancel</button>
                  <button type="submit" className="is-primary">Set password</button>
                </footer>
              </form>
            )}
          </aside>
        </div>
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
                  <button type="button" onClick={() => openPanel({ kind: 'reset', person })}>Reset password</button>
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
