import { useCallback, useState } from 'react'
import type { DispatchSessionCommand } from '../useOccSession'

// Instant feedback (docs/training-layer-plan.md, piece 4): this monitor's last
// refused command, with the server's reason ("Select Train 337 before
// acknowledging its alarm."). The Practice coach shows it; nothing else does,
// so Assessment is unchanged.

export type CommandFeedback = { id: number; text: string }

export function useCommandFeedback(dispatch: DispatchSessionCommand) {
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null)

  const dispatchWithFeedback = useCallback<DispatchSessionCommand>(async (command) => {
    const outcome = await dispatch(command)

    if (!outcome.accepted && outcome.reason) {
      setFeedback({ id: Date.now(), text: outcome.reason })
    } else if (outcome.accepted && command.type !== 'SHOW_NOTICE') {
      // A later action that works answers the message. Status notices are sent
      // by the screens themselves, not by the trainee, so they do not count.
      setFeedback(null)
    }

    return outcome
  }, [dispatch])

  const clearFeedback = useCallback(() => setFeedback(null), [])

  return { clearFeedback, dispatch: dispatchWithFeedback, feedback }
}
