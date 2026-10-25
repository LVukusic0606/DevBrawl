import './StreakBadge.css'

interface StreakBadgeProps {
  current: number
  // Shown as a hint when the streak is alive but today's lesson is still missing
  activeToday?: boolean
  // "full" reads "5-day streak"; "compact" is just the flame and the number (tables, header)
  variant?: 'full' | 'compact'
  best?: number
}

// The learning streak: a flame that's lit while the streak is alive, gray at 0
export function StreakBadge({ current, activeToday = true, variant = 'full', best }: StreakBadgeProps) {
  const lit = current > 0
  const atRisk = lit && !activeToday
  const description =
    current === 0
      ? 'No learning streak. Complete a new lesson to start one.'
      : `${current}-day learning streak${atRisk ? '. Complete a new lesson today to keep it' : ''}`

  return (
    <span
      className={`streak-badge is-${variant}${lit ? ' is-lit' : ''}${atRisk ? ' is-at-risk' : ''}`}
      title={description}
      aria-label={description}
      role="img"
    >
      <i className="ti ti-flame" aria-hidden="true" />
      {variant === 'compact' ? (
        <span className="streak-badge-count" aria-hidden="true">
          {current}
        </span>
      ) : (
        <span className="streak-badge-text" aria-hidden="true">
          <span className="streak-badge-count">{current}-day</span> streak
          {best !== undefined && best > current && ` · best ${best}`}
        </span>
      )}
    </span>
  )
}
