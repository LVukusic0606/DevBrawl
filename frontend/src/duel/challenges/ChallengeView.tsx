import type {
  Answer,
  Challenge,
  CodeInvestigationReveal,
  ConceptQuizReveal,
  FixTheBugReveal,
  FollowTheRequestReveal,
  LineAnswer,
  LogAnalysisReveal,
  OptionAnswer,
  OrderAnswer,
  PathAnswer,
  Reveal,
} from '../types'
import { CodeInvestigation } from './CodeInvestigation'
import { ConceptQuiz } from './ConceptQuiz'
import { FixTheBug } from './FixTheBug'
import { FollowTheRequest } from './FollowTheRequest'
import { LogAnalysis } from './LogAnalysis'
import './Challenges.css'

interface ChallengeViewProps {
  challenge: Challenge
  reveal: Reveal | null
  answer: Answer | null
  locked: boolean
  submitting?: boolean
  onSubmit?: (answer: Answer) => void
}

// The reveal and answer shapes follow the challenge type, so each branch narrows them to match
export function ChallengeView({ challenge, reveal, answer, locked, submitting = false, onSubmit }: ChallengeViewProps) {
  const common = { locked, submitting, onSubmit: (value: Answer) => onSubmit?.(value) }

  switch (challenge.type) {
    case 'conceptQuiz':
      return (
        <ConceptQuiz
          {...common}
          challenge={challenge}
          reveal={reveal as ConceptQuizReveal | null}
          answer={answer as OptionAnswer | null}
        />
      )
    case 'codeInvestigation':
      return (
        <CodeInvestigation
          {...common}
          challenge={challenge}
          reveal={reveal as CodeInvestigationReveal | null}
          answer={answer as PathAnswer | null}
        />
      )
    case 'fixTheBug':
      return (
        <FixTheBug
          {...common}
          challenge={challenge}
          reveal={reveal as FixTheBugReveal | null}
          answer={answer as OptionAnswer | null}
        />
      )
    case 'followTheRequest':
      return (
        <FollowTheRequest
          {...common}
          challenge={challenge}
          reveal={reveal as FollowTheRequestReveal | null}
          answer={answer as OrderAnswer | null}
        />
      )
    case 'logAnalysis':
      return (
        <LogAnalysis
          {...common}
          challenge={challenge}
          reveal={reveal as LogAnalysisReveal | null}
          answer={answer as LineAnswer | null}
        />
      )
  }
}
