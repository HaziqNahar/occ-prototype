import { apiRequest } from './authClient'
import type { RunDetail, RunSummary, TraineeProgress } from './history'

// Past runs and trainee progress (docs/production-plan.md, phase 6). A trainee
// gets only their own; the server enforces it.
export const historyApi = {
  progress: (traineeId?: string) => apiRequest<{ progress: TraineeProgress }>(
    `/api/progress${traineeId ? `?trainee=${encodeURIComponent(traineeId)}` : ''}`,
  ),
  run: (id: string) => apiRequest<{ run: RunDetail }>(`/api/history/${encodeURIComponent(id)}`),
  runs: (traineeId?: string) => apiRequest<{ runs: RunSummary[] }>(
    `/api/history${traineeId ? `?trainee=${encodeURIComponent(traineeId)}` : ''}`,
  ),
}

export function formatRunTime(value: string | undefined) {
  return value ? new Date(value).toLocaleString([], { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function formatResult(result: string) {
  return result === 'PASS' ? 'Pass' : result === 'NEEDS REVIEW' ? 'Needs review' : result === 'IN PROGRESS' ? 'Not completed' : result.toLowerCase()
}
