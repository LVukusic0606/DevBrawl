import { authFetch } from './auth'

// Days in a row with a newly completed lesson (repeats don't count)
export interface Streak {
  current: number
  best: number
  // A lesson was completed today; otherwise a streak that reached yesterday is still alive until today ends
  activeToday: boolean
}

export function getStreak() {
  return authFetch<Streak>('/api/streak')
}
