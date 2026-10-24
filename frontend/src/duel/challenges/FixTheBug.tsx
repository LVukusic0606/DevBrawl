import { useState } from 'react'
import type { FixTheBugChallenge, FixTheBugReveal, OptionAnswer } from '../types'
import { CodeView, LockBar, StatusTag, type ChallengeProps } from './shared'

export function FixTheBug({
  challenge,
  reveal,
  answer,
  locked,
  submitting,
  onSubmit,
}: ChallengeProps<FixTheBugChallenge, FixTheBugReveal, OptionAnswer>) {
  const [selected, setSelected] = useState<string | null>(answer?.optionId ?? null)
  const picked = answer?.optionId ?? selected

  return (
    <div className="duel-challenge">
      <section className="fix-current" aria-label="Current code">
        <p className="duel-panel-label">
          <i className="ti ti-bug" aria-hidden="true" />
          Current code · {challenge.code.language}
        </p>
        <CodeView content={challenge.code.content} />
      </section>

      <p className="duel-panel-label">
        <i className="ti ti-git-pull-request" aria-hidden="true" />
        Candidate fixes
      </p>
      <div className="fix-options" role="radiogroup" aria-label="Candidate fixes">
        {challenge.options.map((option) => {
          const isPicked = picked === option.id
          const isCorrect = reveal?.correctOptionId === option.id
          const outcome = reveal?.outcomes.find((item) => item.optionId === option.id)?.outcome
          const state = reveal ? (isCorrect ? 'is-correct' : isPicked ? 'is-wrong' : 'is-muted') : isPicked ? 'is-picked' : ''

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              className={`fix-option ${state}`}
              disabled={locked}
              onClick={() => setSelected(option.id)}
            >
              <span className="fix-option-head">
                <span className="quiz-option-key">{option.id.toUpperCase()}</span>
                <span className="fix-option-summary">{option.summary}</span>
              </span>
              <CodeView content={option.code} className="is-compact" />
              {reveal && (
                <span className="fix-option-outcome">
                  <span className="quiz-option-tags">
                    {isCorrect && <StatusTag tone="correct">Fixes it</StatusTag>}
                    {!isCorrect && <StatusTag tone="wrong">Doesn't fix it</StatusTag>}
                    {isPicked && <StatusTag tone="picked">Your answer</StatusTag>}
                  </span>
                  {outcome && <span className="fix-option-outcome-text">{outcome}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!locked && (
        <LockBar
          hint={selected ? `You picked fix ${selected.toUpperCase()}.` : 'Pick the change that fixes the bug.'}
          disabled={!selected}
          submitting={submitting}
          onLock={() => selected && onSubmit({ optionId: selected })}
        />
      )}
    </div>
  )
}
