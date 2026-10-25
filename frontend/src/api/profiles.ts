import { authFetch } from './auth'
import type { FriendshipState } from './friends'

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
  // avatarId is one of the preset pictures (see profile/avatars); null shows the nickname's first letter
  // tag is one of the preset tags (see profile/tags); null when the player hasn't picked one
  user: { id: string; nickname: string; memberSince: string; avatarId: number | null; tag: string | null }
  isYou: boolean
  progress: { level: number; totalXp: number; levelStartXp: number; nextLevelXp: number }
  // Average of the category ratings
  overall: { rating: number; tier: RankTier }
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
  // Slugs of the lessons the player has finished
  learning: { completedLessonIds: string[] }
  // Days in a row with a newly completed lesson
  streak: { current: number; best: number; activeToday: boolean }
  // How you relate to this player; null on your own profile. requestId is set while a request is pending.
  friendship: { state: FriendshipState; requestId: string | null } | null
}

// Without a userId: the logged-in player's own profile
export function getProfile(userId?: string) {
  return authFetch<Profile>(userId ? `/api/profiles/${userId}` : '/api/profiles/me')
}
