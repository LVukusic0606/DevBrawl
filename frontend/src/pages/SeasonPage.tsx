import { useEffect, useState, type UIEvent } from 'react'
import { ApiError } from '../api/client'
import { getSeason, type Season, type SeasonReward } from '../api/store'
import { AvatarPicture } from '../profile/AvatarPicture'
import { findAvatar } from '../profile/avatars'
import { findTag } from '../profile/tags'
import './SeasonPage.css'

interface SeasonPageProps {
  onBack: () => void
  onOpenPremium: () => void
}

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; season: Season }

// The monthly season pass: a free and a premium track of rewards, advanced by the XP from lessons and duels.
// Rewards unlock automatically when their stage is reached.
function SeasonPage({ onBack, onOpenPremium }: SeasonPageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getSeason()
      .then((season) => {
        if (!cancelled) setState({ status: 'ready', season })
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({ status: 'error', message: error instanceof ApiError ? error.message : "Couldn't load the season pass." })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <main className="season">
      <header className="season-header">
        <button type="button" className="season-button" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="season-logo">DevBrawl</span>
      </header>

      <div className="season-content">
        {state.status === 'loading' && <p className="season-muted">Loading the season pass…</p>}
        {state.status === 'error' && (
          <div className="season-status">
            <p className="season-error">{state.message}</p>
            <button
              type="button"
              className="season-button"
              onClick={() => {
                setState({ status: 'loading' })
                setAttempt((n) => n + 1)
              }}
            >
              Try again
            </button>
          </div>
        )}
        {state.status === 'ready' && <SeasonView season={state.season} onOpenPremium={onOpenPremium} />}
      </div>
    </main>
  )
}

function SeasonView({ season, onOpenPremium }: { season: Season; onOpenPremium: () => void }) {
  const stages = Array.from({ length: season.stages }, (_, i) => i + 1)
  const maxed = season.stage >= season.stages
  const intoStage = maxed ? season.xpPerStage : season.seasonXp - season.stage * season.xpPerStage
  const rewardAt = (stage: number, track: SeasonReward['track']) =>
    season.rewards.find((r) => r.stage === stage && r.track === track)
  const columns = { gridTemplateColumns: `repeat(${season.stages}, var(--season-card-width))` }

  // The free track, the stage line and the premium track scroll separately, so scrolling one moves the others
  function syncScroll(event: UIEvent<HTMLDivElement>) {
    const left = event.currentTarget.scrollLeft
    const board = event.currentTarget.closest('.season-board')
    board?.querySelectorAll<HTMLDivElement>('.season-scroll').forEach((scroller) => {
      // The equality check stops the scroll events these assignments fire from looping
      if (scroller.scrollLeft !== left) scroller.scrollLeft = left
    })
  }

  return (
    <>
      <section className="season-hero" aria-labelledby="season-title">
        <div className="season-intro">
          <p className="season-eyebrow">
            <span className="season-month">{season.name}</span>
            <span className="season-countdown">
              <i className="ti ti-clock" aria-hidden="true" />
              Ends in {timeLeft(season.endsAt)}
            </span>
          </p>
          <h1 id="season-title" className="season-title">
            Season pass
          </h1>
          <p className="season-muted">
            Earn XP in lessons and duels to reach the next stage. Rewards unlock on their own and stay yours after the month ends.
          </p>
        </div>

        {/* Same layout as the level card on the profile: label on top, the big number with the XP meter beside it */}
        <div className="season-progress">
          <span className="season-progress-label">Currently on stage:</span>
          <span className="season-stage">
            {season.stage}
            <span className="season-stage-max">/{season.stages}</span>
          </span>
          <div className="season-meter">
            <div className="season-meter-labels">
              <span>
                <strong>{season.seasonXp}</strong> XP this month
              </span>
              <span>{maxed ? 'All stages reached' : `${season.xpPerStage - intoStage} XP to stage ${season.stage + 1}`}</span>
            </div>
            <div
              className="season-bar"
              role="progressbar"
              aria-label={maxed ? 'Season pass complete' : `Progress to stage ${season.stage + 1}`}
              aria-valuemin={0}
              aria-valuemax={season.xpPerStage}
              aria-valuenow={intoStage}
            >
              <span className="season-bar-fill" style={{ width: `${(intoStage / season.xpPerStage) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="season-section" aria-label="Rewards">
        {/* Two separate panels with the stage line between them on the page background.
            The three rows scroll sideways together. */}
        <div className="season-board">
          <div className="season-panel">
            <div className="season-track-label">
              <span className="season-track-name">Free pass</span>
              <span className="season-track-note">Rewards for everyone</span>
            </div>
            <div className="season-scroll" onScroll={syncScroll}>
              <ol className="season-row" style={columns} aria-label="Free pass rewards">
                {stages.map((stage) => (
                  <li key={stage} className="season-slot">
                    <RewardCard stage={stage} reward={rewardAt(stage, 'free')} reached={stage <= season.stage} premium={season.isPremium} />
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="season-stages" aria-hidden="true">
            <div className="season-scroll" onScroll={syncScroll}>
              <ol className="season-row is-stages" style={columns}>
                {stages.map((stage) => (
                  <li key={stage} className="season-slot">
                    <span className={`season-stage-pill${stage <= season.stage ? ' is-reached' : ''}`}>{stage}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="season-panel is-premium">
            <div className="season-track-label">
              <span className="season-track-name">Premium pass</span>
              {season.isPremium ? (
                <span className="season-track-note">Unlocked with Premium</span>
              ) : (
                <button type="button" className="season-premium-button" onClick={onOpenPremium}>
                  Get Premium
                </button>
              )}
            </div>
            <div className="season-scroll has-scrollbar" onScroll={syncScroll}>
              <ol className="season-row" style={columns} aria-label="Premium pass rewards">
                {stages.map((stage) => (
                  <li key={stage} className="season-slot">
                    <RewardCard stage={stage} reward={rewardAt(stage, 'premium')} reached={stage <= season.stage} premium={season.isPremium} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

interface RewardCardProps {
  stage: number
  reward: SeasonReward | undefined
  reached: boolean
  premium: boolean
}

function RewardCard({ stage, reward, reached, premium }: RewardCardProps) {
  if (!reward) return <div className="season-card is-empty" aria-hidden="true" />

  // PLACEHOLDER visuals: the avatar picture or the tag's icon and label from the frontend catalogs
  const avatar = reward.kind === 'avatar' ? findAvatar(Number(reward.key)) : undefined
  const tag = reward.kind === 'tag' ? findTag(reward.key) : undefined
  const name = avatar?.label ?? tag?.label ?? reward.key
  const needsPremium = reward.track === 'premium' && !premium
  const state = reward.unlocked ? 'is-unlocked' : needsPremium ? 'is-premium-locked' : reached ? '' : 'is-ahead'

  return (
    <div className={`season-card is-${reward.track} ${state}${avatar?.ultraRare ? ' is-ultra-rare' : ''}`}>
      {/* The stage line is hidden from screen readers, so each reward says its own stage */}
      <span className="season-sr-only">Stage {stage}: </span>
      <span className="season-card-art">
        {avatar ? <AvatarPicture avatar={avatar} nickname="" /> : <i className={`ti ${tag?.icon ?? 'ti-tag'}`} aria-hidden="true" />}
      </span>
      <span className="season-card-name">{name}</span>
      <span className="season-card-kind">{avatar?.ultraRare ? 'Ultra rare' : reward.kind === 'avatar' ? 'Avatar' : 'Tag'}</span>
      {reward.unlocked && (
        <span className="season-card-state">
          <i className="ti ti-check" aria-hidden="true" />
          <span className="season-sr-only">Unlocked</span>
        </span>
      )}
      {!reward.unlocked && needsPremium && (
        <span className="season-card-state">
          <i className="ti ti-lock" aria-hidden="true" />
          <span className="season-sr-only">Needs Premium</span>
        </span>
      )}
    </div>
  )
}

function timeLeft(endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now())
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  return days > 0 ? `${days} days ${hours}h` : `${hours}h`
}

export default SeasonPage
