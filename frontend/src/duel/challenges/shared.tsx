import { useMemo, type ReactNode } from 'react'
import { highlightLines } from './highlight'

export type Tone = 'correct' | 'wrong' | 'picked' | 'warning'

const TONE_ICONS: Record<Tone, string> = {
  correct: 'ti-check',
  wrong: 'ti-x',
  picked: 'ti-point',
  warning: 'ti-alert-triangle',
}

// Color always comes with a text label, never alone
export function StatusTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`duel-tag is-${tone}`}>
      <i className={`ti ${TONE_ICONS[tone]}`} aria-hidden="true" />
      {children}
    </span>
  )
}

interface CodeViewProps {
  content: string
  // Language name from the challenge, used for syntax colors
  language?: string
  // 1-based, inclusive
  highlight?: [number, number] | null
  className?: string
}

export function CodeView({ content, language, highlight, className }: CodeViewProps) {
  const lines = useMemo(() => highlightLines(content, language), [content, language])
  const [from, to] = highlight ?? [0, -1]

  return (
    <pre className={`duel-code ${className ?? ''}`}>
      <code>
        {lines.map((line, index) => {
          const number = index + 1
          const marked = number >= from && number <= to
          return (
            <span key={index} className={`duel-code-line${marked ? ' is-marked' : ''}`}>
              <span className="duel-code-number" aria-hidden="true">
                {number}
              </span>
              <span className="duel-code-text" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
            </span>
          )
        })}
      </code>
    </pre>
  )
}

interface LockBarProps {
  disabled: boolean
  submitting: boolean
  onLock: () => void
}

// The one primary action of a round: answers can't be changed once locked
export function LockBar({ disabled, submitting, onLock }: LockBarProps) {
  return (
    <div className="duel-lockbar">
      <button type="button" className="duel-primary" disabled={disabled || submitting} onClick={onLock}>
        {submitting ? 'Sending' : 'Lock answer'}
        <i className="ti ti-lock" aria-hidden="true" />
      </button>
    </div>
  )
}

export interface ChallengeProps<C, R, A> {
  challenge: C
  // Set after the round ends (and in the review)
  reveal: R | null
  // The player's answer: the one sent this round, or the stored one in the review
  answer: A | null
  // True once the answer is locked, during the reveal and in the review
  locked: boolean
  submitting: boolean
  onSubmit: (answer: A) => void
}
