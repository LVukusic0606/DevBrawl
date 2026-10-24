import { useState } from 'react'
import type { LineAnswer, LogAnalysisChallenge, LogAnalysisReveal } from '../types'
import { LockBar, StatusTag, type ChallengeProps } from './shared'

const LEVEL = /\b(ERROR|FATAL|WARN|WARNING|INFO|DEBUG)\b/

// Colors the log level so errors stand out, the way a real log viewer does
function LogText({ text }: { text: string }) {
  const match = LEVEL.exec(text)
  if (!match) return <>{text}</>
  const level = match[1]
  const tone = level.startsWith('ERR') || level === 'FATAL' ? 'error' : level.startsWith('WARN') ? 'warn' : 'info'
  return (
    <>
      {text.slice(0, match.index)}
      <span className={`log-level is-${tone}`}>{level}</span>
      {text.slice(match.index + level.length)}
    </>
  )
}

export function LogAnalysis({
  challenge,
  reveal,
  answer,
  locked,
  submitting,
  onSubmit,
}: ChallengeProps<LogAnalysisChallenge, LogAnalysisReveal, LineAnswer>) {
  const [selected, setSelected] = useState<number | null>(answer?.line ?? null)
  const picked = answer?.line ?? selected

  return (
    <div className="duel-challenge">
      <div className="logs" role="listbox" aria-label="Log lines">
        {challenge.logs.map((text, index) => {
          const line = index + 1
          const isPicked = picked === line
          const isRoot = reveal?.rootCauseLine === line
          const state = reveal ? (isRoot ? 'is-correct' : isPicked ? 'is-wrong' : '') : isPicked ? 'is-picked' : ''

          return (
            <button
              key={line}
              type="button"
              role="option"
              aria-selected={isPicked}
              className={`log-line ${state}`}
              disabled={locked}
              onClick={() => setSelected(line)}
            >
              <span className="log-line-number">{line}</span>
              <span className="log-line-text">
                <LogText text={text} />
              </span>
              {reveal && isRoot && <StatusTag tone="correct">Root cause</StatusTag>}
              {reveal && isPicked && <StatusTag tone={isRoot ? 'picked' : 'wrong'}>Your pick</StatusTag>}
              {!reveal && isPicked && <StatusTag tone="picked">Your pick</StatusTag>}
            </button>
          )
        })}
      </div>

      {!locked && (
        <LockBar
          disabled={selected === null}
          submitting={submitting}
          onLock={() => selected !== null && onSubmit({ line: selected })}
        />
      )}
    </div>
  )
}
