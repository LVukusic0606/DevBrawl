// Shapes from docs/duel-protocol.md and backend/DevBrawl.Duel/Content/README.md.
// Results are always from this player's point of view.

export type ChallengeType =
  | 'conceptQuiz'
  | 'codeInvestigation'
  | 'fixTheBug'
  | 'followTheRequest'
  | 'logAnalysis'

interface ChallengeBase {
  challengeId: string
  category: { id: number; slug: string; name: string }
  title: string
  prompt: string
}

export interface ConceptQuizChallenge extends ChallengeBase {
  type: 'conceptQuiz'
  options: { id: string; text: string }[]
}

export interface CodeFile {
  path: string
  language: string
  content: string
}

export interface CodeInvestigationChallenge extends ChallengeBase {
  type: 'codeInvestigation'
  files: CodeFile[]
}

export interface FixTheBugChallenge extends ChallengeBase {
  type: 'fixTheBug'
  code: { language: string; content: string }
  options: { id: string; summary: string; code: string }[]
}

export interface FollowTheRequestChallenge extends ChallengeBase {
  type: 'followTheRequest'
  steps: { id: string; text: string }[]
}

export interface LogAnalysisChallenge extends ChallengeBase {
  type: 'logAnalysis'
  logs: string[]
}

export type Challenge =
  | ConceptQuizChallenge
  | CodeInvestigationChallenge
  | FixTheBugChallenge
  | FollowTheRequestChallenge
  | LogAnalysisChallenge

interface RevealBase {
  challengeId: string
  explanation: string
}

export interface ConceptQuizReveal extends RevealBase {
  correctOptionId: string
  commonMistake?: { optionId: string; explanation: string } | null
}

export interface CodeInvestigationReveal extends RevealBase {
  answer: { path: string; lines: [number, number] }
}

export interface FixTheBugReveal extends RevealBase {
  correctOptionId: string
  outcomes: { optionId: string; outcome: string }[]
}

export interface FollowTheRequestReveal extends RevealBase {
  correctOrder: string[]
}

export interface LogAnalysisReveal extends RevealBase {
  rootCauseLine: number
}

export type Reveal =
  | ConceptQuizReveal
  | CodeInvestigationReveal
  | FixTheBugReveal
  | FollowTheRequestReveal
  | LogAnalysisReveal

export interface OptionAnswer {
  optionId: string
}

export interface PathAnswer {
  path: string
}

export interface OrderAnswer {
  stepIds: string[]
}

export interface LineAnswer {
  line: number
}

export type Answer = OptionAnswer | PathAnswer | OrderAnswer | LineAnswer

export interface Player {
  id: string
  nickname: string
  // Picked avatar (see profile/avatars); null when none
  avatarId: number | null
  // category id → rating
  ratings: Record<string, number>
}

export type RoundResult = 'won' | 'lost' | 'draw' | 'noWinner'
export type DuelResult = 'won' | 'lost' | 'draw'

export interface MatchFoundEvent {
  duelId: string
  you: Player
  opponent: Player
  startsAt: string
  // Server clock when sent; see serverClock.ts
  serverTime: string
}

export interface RoundStartedEvent {
  duelId: string
  roundNumber: number
  type: ChallengeType
  categoryId: number
  challenge: Challenge
  timeLimitSeconds: number
  endsAt: string
  serverTime: string
}

export interface RoundAnswerEvent {
  duelId: string
  roundNumber: number
}

export interface RoundEndedEvent {
  duelId: string
  roundNumber: number
  youAnswered: boolean
  youCorrect: boolean
  opponentAnswered: boolean
  opponentCorrect: boolean
  result: RoundResult
  yourScore: number
  opponentScore: number
  reveal: Reveal
}

export interface RatingChange {
  categoryId: number
  before: number
  after: number
  delta: number
}

export interface DuelEndedEvent {
  duelId: string
  result: DuelResult
  yourScore: number
  opponentScore: number
  ratingChanges: RatingChange[]
  xpGained: number
  totalXp: number
  level: number
}

export interface DuelStateEvent {
  duelId: string
  you: Player
  opponent: Player
  phase: 'countdown' | 'round' | 'reveal'
  roundNumber: number
  phaseEndsAt: string
  currentRound: RoundStartedEvent | null
  youAnswered: boolean
  opponentAnswered: boolean
  yourScore: number
  opponentScore: number
  lastRoundEnded: RoundEndedEvent | null
  serverTime: string
}

export interface DuelAbortedEvent {
  duelId: string
  reason: string
}

export interface SubmitResult {
  ok: boolean
  error: string | null
}

// REST: GET /api/duels and GET /api/duels/{id}

export interface DuelSummary {
  id: string
  status: 'inProgress' | 'finished' | 'abandoned'
  opponent: { id: string; nickname: string }
  result: DuelResult | null
  yourScore: number
  opponentScore: number
  startedAt: string
  finishedAt: string | null
}

export interface DuelRoundReview {
  roundNumber: number
  type: ChallengeType
  categoryId: number
  challenge: Challenge
  yourAnswer: Answer | null
  youCorrect: boolean
  opponentAnswered: boolean
  opponentCorrect: boolean
  result: RoundResult
  reveal: Reveal
}

export interface DuelDetails {
  summary: DuelSummary
  rewards: {
    ratingChanges: RatingChange[]
    xpGained: number
    totalXp: number
    level: number
  } | null
  rounds: DuelRoundReview[]
}
