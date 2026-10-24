import { useState } from 'react'
import type { ConceptQuizChallenge, ConceptQuizReveal, OptionAnswer } from '../types'
import { LockBar, StatusTag, type ChallengeProps } from './shared'

export function ConceptQuiz({
  challenge,
  reveal,
  answer,
  locked,
  submitting,
  onSubmit,
}: ChallengeProps<ConceptQuizChallenge, ConceptQuizReveal, OptionAnswer>) {
  const [selected, setSelected] = useState<string | null>(answer?.optionId ?? null)
  const picked = answer?.optionId ?? selected

  return (
    <div className="duel-challenge">
      <div className="quiz-options" role="radiogroup" aria-label="Answers">
        {challenge.options.map((option) => {
          const isPicked = picked === option.id
          const isCorrect = reveal?.correctOptionId === option.id
          const state = reveal
            ? isCorrect
              ? 'is-correct'
              : isPicked
                ? 'is-wrong'
                : 'is-muted'
            : isPicked
              ? 'is-picked'
              : ''

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              className={`quiz-option ${state}`}
              disabled={locked}
              onClick={() => setSelected(option.id)}
            >
              <span className="quiz-option-key">{option.id.toUpperCase()}</span>
              <span className="quiz-option-body">
                <span className="quiz-option-text">{option.text}</span>
                {/* The green border marks the correct answer; screen readers get it as text */}
                {reveal && isCorrect && <span className="duel-sr-only">Correct answer</span>}
                {reveal && isPicked && (
                  <span className="quiz-option-tags">
                    <StatusTag tone={isCorrect ? 'picked' : 'wrong'}>Your answer</StatusTag>
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {!locked && (
        <LockBar
          disabled={!selected}
          submitting={submitting}
          onLock={() => selected && onSubmit({ optionId: selected })}
        />
      )}
    </div>
  )
}
