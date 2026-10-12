import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PublicUser } from '../accounts'
import occMonitorBackground from '../assets/occ-monitor-bg.png'
import sbsTransitLogo from '../assets/sbs-transit-logo.png'
import { exerciseApi } from '../exerciseClient'
import type { ExerciseSummary, TraineeAccount } from '../exerciseClient'
import type { SessionActor } from '../session-commands/types'
import type { AppRoute } from '../types'
import ExercisePanel from './ExercisePanel'

type IosModulesScreenProps = {
  getActor: () => SessionActor
  onNavigate: (route: AppRoute, search?: string) => void
  onSignOut: () => void
  onSignedOut: () => void
  token: string | null
  // Null without accounts (no training server): one exercise, kept in this page.
  user: PublicUser | null
}

// Exercises can be added or closed from another console; check every few seconds.
const EXERCISE_REFRESH_MS = 4000

// Trainer Console: up to two exercises side by side, one per trainee, each with
// its own scenario, checklist, score and monitors (docs/production-plan.md, phase 5).
function IosModulesScreen({ getActor, onNavigate, onSignOut, onSignedOut, token, user }: IosModulesScreenProps) {
  const [exercises, setExercises] = useState<ExerciseSummary[] | null>(null)
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [message, setMessage] = useState('')

  const refresh = useCallback(() => {
    if (!user) {
      return
    }

    void exerciseApi.list().then((result) => setExercises(result.sessions)).catch(() => undefined)
    void exerciseApi.trainees().then((result) => setTrainees(result.trainees)).catch(() => undefined)
  }, [user])

  useEffect(() => {
    refresh()

    const timer = window.setInterval(refresh, EXERCISE_REFRESH_MS)

    return () => window.clearInterval(timer)
  }, [refresh])

  const run = (action: () => Promise<{ accepted?: boolean; reason?: string | null } | unknown>) => {
    setMessage('')
    void action()
      .then((result) => {
        const outcome = result as { accepted?: boolean; reason?: string | null }

        if (outcome?.accepted === false) {
          setMessage(outcome.reason ?? 'That did not work.')
        }

        refresh()
      })
      .catch((error: Error) => setMessage(error.message))
  }

  // Without a server there is one exercise in this page; with one, wait for the list.
  const panels: Array<ExerciseSummary | null> = user ? exercises ?? [] : [null]

  return (
    <main
      className={`trainer-console ${panels.length > 1 ? 'has-two-exercises' : ''}`}
      style={{ '--occ-bg': `url(${occMonitorBackground})` } as CSSProperties}
    >
      <header className="trainer-console-header">
        <div className="trainer-console-brand">
          <img src={sbsTransitLogo} alt="SBS Transit" />
          <div>
            <p>{user ? `Instructor station · ${user.name}` : 'Instructor station'}</p>
            <h1>Trainer Console</h1>
          </div>
        </div>
        {message && <p className="trainer-console-message" role="alert">{message}</p>}
        <nav aria-label="Trainer tools">
          {user && panels.length === 1 && (
            <button type="button" onClick={() => run(exerciseApi.add)}>Add Exercise 2</button>
          )}
          {user?.admin && <button type="button" onClick={() => onNavigate('/admin')}>People</button>}
          {user
            ? <button type="button" className="is-quiet" onClick={onSignOut}>Sign out</button>
            : <button type="button" className="is-quiet" onClick={() => onNavigate('/')}>Exit</button>}
        </nav>
      </header>

      <div className="trainer-console-exercises">
        {panels.map((exercise) => (
          <ExercisePanel
            exercise={exercise}
            exercises={exercises ?? []}
            getActor={getActor}
            key={exercise?.exercise ?? 1}
            onAssign={(traineeId, sessionId) => run(() => exerciseApi.assign(traineeId, sessionId))}
            onClose={(sessionId) => run(() => exerciseApi.remove(sessionId))}
            onOpenReport={(sessionCode) => onNavigate('/report', `?session=${encodeURIComponent(sessionCode)}`)}
            onSignedOut={onSignedOut}
            token={token}
            trainees={trainees}
          />
        ))}
      </div>
    </main>
  )
}

export default IosModulesScreen
