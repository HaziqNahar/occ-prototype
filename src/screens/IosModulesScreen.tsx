import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicUser } from '../accounts'
import { AuthRequestError } from '../authClient'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
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

// Trainer Console: up to two exercises, one per trainee, each with its own
// scenario, steps, score and monitors (docs/production-plan.md, phase 5). One
// exercise shows at a time; its tab says when the other needs the trainer.
function IosModulesScreen({ getActor, onNavigate, onSignOut, onSignedOut, token, user }: IosModulesScreenProps) {
  const [exercises, setExercises] = useState<ExerciseSummary[] | null>(null)
  const [trainees, setTrainees] = useState<TraineeAccount[]>([])
  const [message, setMessage] = useState('')
  // Why the exercise list could not be loaded; shown instead of an empty console.
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [attention, setAttention] = useState<Record<string, boolean>>({})
  const exerciseCount = useRef(0)

  const refresh = useCallback(() => {
    if (!user) {
      return
    }

    void exerciseApi.list()
      .then((result) => {
        setExercises(result.sessions)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (error instanceof AuthRequestError && error.status === 401) {
          onSignedOut()
          return
        }

        setLoadError(error instanceof AuthRequestError
          ? error.message
          : 'Cannot reach the training server. Check that the server window on the host PC is open.')
      })
    void exerciseApi.trainees().then((result) => setTrainees(result.trainees)).catch(() => undefined)
  }, [onSignedOut, user])

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
  const panelKey = (exercise: ExerciseSummary | null) => exercise?.id ?? 'local'
  const shownKey = panels.some((exercise) => panelKey(exercise) === activeId) ? activeId : panelKey(panels[0] ?? null)

  // A newly added exercise opens in front.
  useEffect(() => {
    const count = exercises?.length ?? 0

    if (exercises && count > exerciseCount.current && exerciseCount.current > 0) {
      setActiveId(exercises[count - 1].id)
    }

    exerciseCount.current = count
  }, [exercises])

  const noteAttention = useCallback((key: string, needsTrainer: boolean) => {
    setAttention((current) => (current[key] === needsTrainer ? current : { ...current, [key]: needsTrainer }))
  }, [])

  return (
    <AppShell
      active="console"
      actions={user && panels.length === 1 && (
        <button type="button" onClick={() => run(exerciseApi.add)}>Add Exercise 2</button>
      )}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      title="Trainer Console"
      user={user}
    >
      {message && <p className="trainer-console-notice is-warning" role="alert">{message}</p>}

      {user && exercises === null && (
        <section className="trainer-console-panel trainer-console-empty trainer-console-status-panel" role="status">
          <strong>{loadError ? 'Training server not available' : 'Loading exercises…'}</strong>
          {loadError && <span>{loadError} Retrying every few seconds.</span>}
        </section>
      )}

      {user && exercises?.length === 0 && (
        <section className="trainer-console-panel">
          <EmptyState
            action={<button type="button" className="is-primary" onClick={() => run(exerciseApi.add)}>Create session</button>}
            icon="session"
            text="Create the training session to get a code for trainees to join. It stays open, also after the server restarts."
            title="No session yet"
          />
        </section>
      )}

      {panels.length > 1 && (
        <div className="tc-tabs" role="tablist" aria-label="Exercises">
          {panels.map((exercise) => {
            const key = panelKey(exercise)
            const trainee = exercise?.trainees[0]?.name.split(' ')[0]
            const state = !exercise || exercise.scenarioMode === 'IDLE' ? 'no run' : exercise.scenarioMode.toLowerCase()

            return (
              <button
                aria-selected={key === shownKey}
                className={`tc-tab ${key === shownKey ? 'is-active' : ''}`}
                key={key}
                onClick={() => setActiveId(key)}
                role="tab"
                type="button"
              >
                <strong>Exercise {exercise?.exercise ?? 1}</strong>
                <span>{trainee ?? 'no trainee'} · {state}</span>
                {attention[key] && <em className="tc-tab-flag">needs you</em>}
              </button>
            )
          })}
        </div>
      )}

      <div className="trainer-console-exercises">
        {panels.map((exercise) => (
          <ExercisePanel
            exercise={exercise}
            exercises={exercises ?? []}
            getActor={getActor}
            hidden={panelKey(exercise) !== shownKey}
            key={exercise?.exercise ?? 1}
            onAttention={(needsTrainer) => noteAttention(panelKey(exercise), needsTrainer)}
            onAssign={(traineeId, sessionId) => run(() => exerciseApi.assign(traineeId, sessionId))}
            onClose={(sessionId) => run(() => exerciseApi.remove(sessionId))}
            onOpenReport={(sessionCode) => onNavigate('/report', `?session=${encodeURIComponent(sessionCode)}`)}
            onSignedOut={onSignedOut}
            token={token}
            trainees={trainees}
          />
        ))}
      </div>
    </AppShell>
  )
}

export default IosModulesScreen
