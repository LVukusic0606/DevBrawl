import { authFetch } from './auth'
import type { RankTier } from './profiles'

export interface LeaderboardEntry {
  // Tied players share a position
  position: number
  userId: string
  nickname: string
  // Preset avatar and tag, as on the profile (see profile/avatars and profile/tags); null when not picked
  avatarId: number | null
  tag: string | null
  // Average of the category ratings
  rating: number
  tier: RankTier
  duelsPlayed: number
  wins: number
  // From total XP, the same level the profile shows
  level: number
  isYou: boolean
}

export interface Leaderboard {
  totalPlayers: number
  entries: LeaderboardEntry[]
  // Your row when you're ranked but not in entries
  you: LeaderboardEntry | null
}

// Players with at least one finished duel, ranked by overall rating
export function getLeaderboard(limit = 50) {
  return authFetch<Leaderboard>(`/api/leaderboard?limit=${limit}`)
}
