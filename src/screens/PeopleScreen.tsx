import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getDisplayNameProblem, getPasswordProblem, getUsernameProblem, PASSWORD_MIN_LENGTH } from '../accounts'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import SidePanel from '../components/SidePanel'
import { SkeletonRows } from '../components/Skeleton'
import Toast from '../components/Toast'
import type { PublicUser, UserRole } from '../accounts'
import { authApi } from '../authClient'
import type { AppRoute } from '../types'


type PeopleScreenProps = {
  onNavigate: (route: AppRoute) => void
  onSignOut?: () => void
  // Ends this browser's sign-in with a message (after changing your own password).
  onSignedOut?: (message: string) => void
  user: PublicUser
}

// Admin trainers add trainers and trainees, reset passwords and switch
// accounts off. Accounts are never deleted, so past runs keep their names.
function PeopleScreen({ onNavigate, onSignedOut, onSignOut, user }: PeopleScreenProps) {
  const [users, setUsers] = useState<PublicUser[] | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ admin: false, name: '', password: '', role: 'trainee' as UserRole, username: '' })
  // The side panel: adding a person, or a new password for one.
  const [panel, setPanel] = useState<{ kind: 'add' } | { kind: 'reset'; person: PublicUser } | null>(null)
  const [panelError, setPanelError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const openPanel = (next: typeof panel) => {
    setPanel(next)
    setPanelError('')
    setNewPassword('')
    setConfirmPassword('')
  }
  const closePanel = useCallback(() => setPanel(null), [])
  const clearNote = useCallback(() => setNote(''), [])

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
      ?? (newPassword === confirmPassword ? null : 'The two passwords do not match.')

    if (problem) {
      setPanelError(problem)
      return
    }

    void authApi.updateUser(person.id, { password: newPassword })
      .then(() => {
        // A password change signs the account out everywhere, this browser too.
        if (person.id === user.id) {
          onSignedOut?.('Your password was changed. Sign in with the new password.')
          return
        }

        setNote(`Password for ${person.name} changed. They are signed out everywhere.`)
        setError('')
        setPanel(null)
      })
      .catch((resetError: Error) => setPanelError(resetError.message))
  }

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
      {note && <Toast message={note} onClose={clearNote} />}

      {panel && (
        <SidePanel onClose={closePanel} title={panel.kind === 'add' ? 'Add person' : 'Reset password'}>
          {panel.kind === 'add' ? (
            <form className="side-panel-form" onSubmit={addPerson}>
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
                <button type="button" onClick={closePanel}>Cancel</button>
                <button type="submit" className="is-primary">Add person</button>
              </footer>
            </form>
          ) : (
            <form className="side-panel-form" onSubmit={(event) => resetPassword(event, panel.person)}>
              <p className="side-panel-lead">{panel.person.name} · {panel.person.id}</p>
              <label className="side-panel-field">
                <span>New password</span>
                <input autoComplete="new-password" autoFocus onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
                <small>At least {PASSWORD_MIN_LENGTH} characters.</small>
              </label>
              <label className="side-panel-field">
                <span>Confirm new password</span>
                <input autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
                <small>{panel.person.id === user.id ? 'You will be signed out and sign in again with the new password.' : 'They are signed out everywhere.'}</small>
              </label>
              {panelError && <p className="side-panel-error" role="alert">{panelError}</p>}
              <footer>
                <button type="button" onClick={closePanel}>Cancel</button>
                <button type="submit" className="is-primary">Set password</button>
              </footer>
            </form>
          )}
        </SidePanel>
      )}

      <section className="trainer-console-panel" aria-labelledby="people-list-heading">
        <div className="trainer-console-panel-head">
          <h2 id="people-list-heading">Accounts</h2>
          <span>{users ? `${users.filter((person) => !person.disabled).length} active` : ''}</span>
        </div>
        {!users ? <SkeletonRows columns={4} rows={3} /> : (
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
        )}
        {users && users.length === 1 && (
          <EmptyState
            action={<button type="button" className="is-primary" onClick={() => openPanel({ kind: 'add' })}>Add person</button>}
            icon="people"
            text="Add the other trainers and the trainees. Each gets their own username and password."
            title="Only you so far"
          />
        )}
      </section>
    </AppShell>
  )
}

export default PeopleScreen
