import type { DuelDetails, DuelSummary } from '../duel/types'
import { authFetch } from './auth'

export function getRecentDuels(limit = 20) {
  return authFetch<DuelSummary[]>(`/api/duels?limit=${limit}`)
}

export function getDuel(id: string) {
  return authFetch<DuelDetails>(`/api/duels/${encodeURIComponent(id)}`)
}
