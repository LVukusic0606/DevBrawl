// Charts for the profile page, built from plain HTML: marks carry color, text always uses text tokens,
// and every value is written out, so nothing needs hovering.

import type { ReactNode } from 'react'

// Every player starts here in every category; drawn as the reference line
const STARTING_RATING = 1000

interface DotPlotRow {
  key: number
  label: string
  rating: number
  // Shown after the value, e.g. the tier and the last change
  detail: ReactNode
  badge: 'strongest' | 'weakest' | null
}

// Clean tick step and a domain around the data that always includes the starting rating
function scale(values: number[]) {
  const low = Math.min(...values, STARTING_RATING)
  const high = Math.max(...values, STARTING_RATING)
  const step = high - low > 400 ? 100 : 50
  const min = Math.floor((low - step / 2) / step) * step
  const max = Math.ceil((high + step / 2) / step) * step
  const ticks: number[] = []
  for (let t = min; t <= max; t += step) ticks.push(t)
  return { min, max, ticks, at: (value: number) => ((value - min) / (max - min)) * 100 }
}

// All categories on one shared axis, so the strongest and weakest stand out at a glance.
// Every value is written next to its dot, so nothing depends on reading the axis.
export function RatingDotPlot({ rows }: { rows: DotPlotRow[] }) {
  const { ticks, at } = scale(rows.map((r) => r.rating))
  const start = at(STARTING_RATING)

  return (
    <div className="dotplot">
      <div className="dotplot-axis" aria-hidden="true">
        <span />
        <div className="dotplot-ticks">
          {ticks.map((t) => (
            <span key={t} className="dotplot-tick" style={{ left: `${at(t)}%` }}>
              {t}
            </span>
          ))}
        </div>
        <span />
      </div>
      <ul className="dotplot-rows">
        {rows.map((row) => (
          <li key={row.key} className={`dotplot-row${row.badge ? ` is-${row.badge}` : ''}`}>
            <span className="dotplot-label">{row.label}</span>
            <span className="dotplot-track" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="dotplot-grid" style={{ left: `${at(t)}%` }} />
              ))}
              <span className="dotplot-start" style={{ left: `${start}%` }} />
              <span className="dotplot-dot" style={{ left: `${at(row.rating)}%` }} />
            </span>
            <span className="dotplot-value">
              <strong>{row.rating}</strong>
              <span>{row.detail}</span>
              {row.badge && (
                <span className="dotplot-badge">
                  <i
                    className={`ti ${row.badge === 'strongest' ? 'ti-trending-up' : 'ti-trending-down'}`}
                    aria-hidden="true"
                  />
                  {row.badge === 'strongest' ? 'Strongest' : 'Weakest'}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="dotplot-caption">
        <span className="dotplot-start-key" aria-hidden="true" />
        Everyone starts at {STARTING_RATING} in every category.
      </p>
    </div>
  )
}

export interface BarRow {
  key: string
  label: string
  correct: number
  total: number
}

// Accuracy per row on a shared 0-100% scale. The percentage and the count are always shown as text.
export function AccuracyBars({ rows, label }: { rows: BarRow[]; label: string }) {
  return (
    <ul className="bars" aria-label={label}>
      {rows.map((row) => {
        const percent = row.total > 0 ? Math.round((row.correct / row.total) * 100) : null
        return (
          <li key={row.key} className="bars-row">
            <span className="bars-label">{row.label}</span>
            <span className="bars-track" aria-hidden="true">
              {percent !== null && percent > 0 && <span className="bars-fill" style={{ width: `${percent}%` }} />}
            </span>
            {percent === null ? (
              <span className="bars-value is-empty">No rounds yet</span>
            ) : (
              <span className="bars-value">
                <strong>{percent}%</strong>
                <span>
                  {row.correct}/{row.total}
                </span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface RecordBarProps {
  wins: number
  draws: number
  losses: number
}

// Wins, draws and losses as one bar. Draws sit in the middle so green and red never touch,
// and the legend repeats every count as text.
export function RecordBar({ wins, draws, losses }: RecordBarProps) {
  const segments = [
    { key: 'win', count: wins, label: wins === 1 ? 'win' : 'wins' },
    { key: 'draw', count: draws, label: draws === 1 ? 'draw' : 'draws' },
    { key: 'loss', count: losses, label: losses === 1 ? 'loss' : 'losses' },
  ]

  return (
    <div className="record">
      <div className="record-bar" aria-hidden="true">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.key} className={`record-seg is-${s.key}`} style={{ flexGrow: s.count }} />
          ))}
      </div>
      <ul className="record-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`record-swatch is-${s.key}`} aria-hidden="true" />
            <strong>{s.count}</strong> {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface XpMeterProps {
  totalXp: number
  levelStartXp: number
  nextLevelXp: number
  level: number
}

export function XpMeter({ totalXp, levelStartXp, nextLevelXp, level }: XpMeterProps) {
  const span = nextLevelXp - levelStartXp
  const percent = span > 0 ? Math.min(100, ((totalXp - levelStartXp) / span) * 100) : 100

  return (
    <div className="xp">
      <div className="xp-labels">
        <span>
          <strong>{totalXp}</strong> XP
        </span>
        <span className="xp-next">
          {nextLevelXp - totalXp} XP to level {level + 1}
        </span>
      </div>
      <div
        className="xp-track"
        role="progressbar"
        aria-label={`Progress to level ${level + 1}`}
        aria-valuemin={levelStartXp}
        aria-valuemax={nextLevelXp}
        aria-valuenow={totalXp}
      >
        {percent > 0 && <span className="xp-fill" style={{ width: `${percent}%` }} />}
      </div>
    </div>
  )
}
