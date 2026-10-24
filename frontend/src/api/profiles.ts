import { authFetch } from './auth'

export type RankTier =
  | 'beginner'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'grandmaster'

export type ChallengeType =
  | 'conceptQuiz'
  | 'codeInvestigation'
  | 'fixTheBug'
  | 'followTheRequest'
  | 'logAnalysis'

export type DuelResult = 'won' | 'lost' | 'draw'

export interface ProfileRating {
  categoryId: number
  slug: string
  name: string
  rating: number
  tier: RankTier
  // Change in the last duel that changed this category; null before the first one
  lastDelta: number | null
}

export interface Accuracy {
  correct: number
  total: number
}

export interface ProfileDuel {
  id: string
  opponent: { id: string; nickname: string }
  result: DuelResult
  yourScore: number
  opponentScore: number
  finishedAt: string
  ratingDelta: number
}

export interface Profile {
  user: { id: string; nickname: string; memberSince: string }
  isYou: boolean
  progress: { level: number; totalXp: number; levelStartXp: number; nextLevelXp: number }
  ratings: ProfileRating[]
  strongestCategoryId: number | null
  weakestCategoryId: number | null
  duels: { played: number; wins: number; losses: number; draws: number }
  accuracy: {
    overall: Accuracy
    byCategory: (Accuracy & { categoryId: number })[]
    byType: (Accuracy & { type: ChallengeType })[]
  }
  recentDuels: ProfileDuel[]
  // Filled in once the Learn backend exists
  learning: unknown | null
}

// Without a userId: the logged-in player's own profile
export function getProfile(userId?: string) {
  return authFetch<Profile>(userId ? `/api/profiles/${userId}` : '/api/profiles/me')
}
