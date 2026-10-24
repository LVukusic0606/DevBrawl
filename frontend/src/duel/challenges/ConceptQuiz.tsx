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
          const mistake = reveal?.commonMistake?.optionId === option.id ? reveal.commonMistake : null
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
                {reveal && (isCorrect || isPicked) && (
                  <span className="quiz-option-tags">
                    {isCorrect && <StatusTag tone="correct">Correct answer</StatusTag>}
                    {isPicked && !isCorrect && <StatusTag tone="wrong">Your answer</StatusTag>}
                    {isPicked && isCorrect && <StatusTag tone="picked">Your answer</StatusTag>}
                  </span>
                )}
                {mistake && (
                  <span className="quiz-option-mistake">
                    <StatusTag tone="warning">Common mistake</StatusTag>
                    {mistake.explanation}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {!locked && (
        <LockBar
          hint={selected ? `You picked ${selected.toUpperCase()}.` : 'Pick the best answer.'}
          disabled={!selected}
          submitting={submitting}
          onLock={() => selected && onSubmit({ optionId: selected })}
        />
      )}
    </div>
  )
}
