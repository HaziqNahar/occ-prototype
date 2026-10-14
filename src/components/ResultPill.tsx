import { formatResult } from '../historyClient'

// A run's result as a small coloured label: green pass, amber needs review,
// grey not completed.
function ResultPill({ completed = true, result }: { completed?: boolean; result: string }) {
  const tone = !completed || result === 'IN PROGRESS' ? 'open' : result === 'PASS' ? 'pass' : 'review'

  return <span className={`result-pill is-${tone}`}>{completed ? formatResult(result) : 'Not completed'}</span>
}

export default ResultPill
