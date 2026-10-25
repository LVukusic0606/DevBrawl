import type { ChallengeType, RankTier } from '../api/profiles'

const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const monthYear = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })

// "Oct 24"
export const formatDate = (iso: string) => date.format(new Date(iso))
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso))

// "+16", "-12", "0"
export const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`)

export const TIER_LABELS: Record<RankTier, string> = {
  beginner: 'Beginner',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
}

// Round order A to E
export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  conceptQuiz: 'Concept quiz',
  codeInvestigation: 'Code investigation',
  fixTheBug: 'Fix the bug',
  followTheRequest: 'Follow the request',
  logAnalysis: 'Log analysis',
}
