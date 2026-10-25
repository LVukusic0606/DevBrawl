import { authFetch } from './auth'
import { request } from './client'

export type RewardTrack = 'free' | 'premium'
export type RewardKind = 'avatar' | 'tag'

export interface SeasonReward {
  stage: number
  track: RewardTrack
  kind: RewardKind
  // Avatar id (as text) or tag id
  key: string
  unlocked: boolean
}

export interface Season {
  key: string
  name: string
  startsAt: string
  endsAt: string
  stages: number
  xpPerStage: number
  // XP earned this month; resets every month (total XP on the profile doesn't)
  seasonXp: number
  // 0 to stages; not the player's level from the profile
  stage: number
  isPremium: boolean
  rewards: SeasonReward[]
}

export interface OwnedCosmetics {
  avatarIds: number[]
  tags: string[]
}

export interface Premium {
  isPremium: boolean
  premiumUntil: string | null
  monthlyPriceEur: number
  freeInterviewsPerMonth: number
  premiumInterviewsPerMonth: number
  interviews: { used: number; limit: number }
}

export interface ContactForm {
  name: string
  institution: string
  email: string
  message: string
}

export function getSeason() {
  return authFetch<Season>('/api/season')
}

// Starter avatars and tags plus everything unlocked in season passes
export function getOwnedCosmetics() {
  return authFetch<OwnedCosmetics>('/api/season/owned')
}

export function getPremium() {
  return authFetch<Premium>('/api/premium')
}

// Demo checkout: grants a month of Premium without a payment
export function activatePremium() {
  return authFetch<Premium>('/api/premium/activate', { method: 'POST' })
}

// Doesn't need a login, so it can also be used outside the app later
export function sendContactForm(form: ContactForm) {
  return request<void>('/api/contact', { method: 'POST', body: JSON.stringify(form) })
}
