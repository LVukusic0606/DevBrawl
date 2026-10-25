import { useCountdown } from '../useCountdown'
import type { Match } from '../useDuel'
import type { Player } from '../types'

interface MatchIntroProps {
  match: Match
  startsAt: string
  categoryName: (id: number) => string
}

export function MatchIntro({ match, startsAt, categoryName }: MatchIntroProps) {
  const left = useCountdown(startsAt) ?? 0
  const seconds = Math.ceil(left / 1000)

  return (
    <section className="duel-intro" aria-labelledby="intro-title">
      <h1 id="intro-title" className="duel-sr-only">
        Match found
      </h1>
      <PlayerCard label="You" player={match.you} categoryName={categoryName} />

      <div className="duel-intro-center" aria-live="polite">
        <p className="duel-intro-label">{match.friendly ? 'Friendly duel' : 'Match found'}</p>
        <p className="duel-intro-vs">vs</p>
        <p className="duel-big-number is-duel">{seconds > 0 ? seconds : 'Go'}</p>
        <p className="duel-intro-status">{seconds > 0 ? 'Round 1 starts soon.' : 'Starting.'}</p>
        {match.friendly && <p className="duel-muted">No ELO or XP changes.</p>}
      </div>

      <PlayerCard label="Opponent" player={match.opponent} categoryName={categoryName} />
    </section>
  )
}

function PlayerCard({
  label,
  player,
  categoryName,
}: {
  label: string
  player: Player
  categoryName: (id: number) => string
}) {
  const ratings = Object.entries(player.ratings)
  // Overall ELO: the average of the category ratings
  const overall = ratings.length
    ? Math.round(ratings.reduce((sum, [, rating]) => sum + rating, 0) / ratings.length)
    : null

  return (
    <article className="duel-player">
      <header className="duel-player-head">
        <div className="duel-player-who">
          <p className="duel-player-label">{label}</p>
          <h2 className="duel-player-name">{player.nickname}</h2>
        </div>
        <p className="duel-player-elo" aria-label={`Overall ELO ${overall ?? 'unknown'}`}>
          <span className="duel-player-elo-label">ELO</span>
          <span className="duel-player-elo-value">{overall ?? '–'}</span>
        </p>
      </header>
      <ul className="duel-ratings">
        {ratings.map(([categoryId, rating]) => (
          <li key={categoryId} className="duel-rating">
            <span>{categoryName(Number(categoryId))}</span>
            <span className="duel-rating-value">{rating}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
