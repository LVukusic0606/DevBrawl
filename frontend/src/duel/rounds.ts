import type { ChallengeType, RoundResult } from './types'

// The five rounds always come in this order (spec section 6)
export const ROUND_TYPES: { type: ChallengeType; name: string; task: string; icon: string }[] = [
  { type: 'conceptQuiz', name: 'Concept quiz', task: 'Pick the best approach.', icon: 'ti-bulb' },
  { type: 'codeInvestigation', name: 'Code investigation', task: 'Find the file where it breaks.', icon: 'ti-folder-search' },
  { type: 'fixTheBug', name: 'Fix the bug', task: 'Choose the change that fixes it.', icon: 'ti-tool' },
  { type: 'followTheRequest', name: 'Follow the request', task: 'Put the steps in order.', icon: 'ti-route' },
  { type: 'logAnalysis', name: 'Log analysis', task: 'Find the line that explains it.', icon: 'ti-file-search' },
]

export const TOTAL_ROUNDS = ROUND_TYPES.length

export function roundTypeName(type: ChallengeType) {
  return ROUND_TYPES.find((round) => round.type === type)?.name ?? type
}

export function roundTypeIcon(type: ChallengeType) {
  return ROUND_TYPES.find((round) => round.type === type)?.icon ?? 'ti-puzzle'
}

export const ROUND_RESULT_LABELS: Record<RoundResult, string> = {
  won: 'Round won',
  lost: 'Round lost',
  draw: 'Draw',
  noWinner: 'No winner',
}

// When both players were right, the faster one wins the round; say so, or a lost round looks like a wrong answer
export function roundSpeedNote(result: RoundResult, youCorrect: boolean, opponentCorrect: boolean, opponentName: string) {
  if (result === 'won' && opponentCorrect) return 'Both right. You answered first.'
  if (result === 'lost' && youCorrect) return `Both right. ${opponentName} answered first.`
  return null
}

// One sentence that says why the round ended the way it did
export function roundSummary(
  result: RoundResult,
  you: { answered: boolean; correct: boolean },
  opponent: { answered: boolean; correct: boolean },
  opponentName: string,
) {
  const speed = roundSpeedNote(result, you.correct, opponent.correct, opponentName)
  if (speed) return speed
  if (result === 'won') return 'Only you got it right.'
  if (result === 'lost') return `Only ${opponentName} got it right.`
  if (result === 'draw') return 'Both right at the same moment.'
  if (!you.answered && !opponent.answered) return 'Nobody answered in time.'
  return 'Neither of you got it right.'
}
