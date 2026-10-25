import { useEffect, useState } from 'react'
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

  return (
    <>
      <section className="season-hero" aria-labelledby="season-title">
        <div>
          <p className="season-eyebrow">
            <i className="ti ti-clock" aria-hidden="true" /> Ends in {timeLeft(season.endsAt)}
          </p>
          <h1 id="season-title" className="season-title">
            Season pass · {season.name}
          </h1>
          <p className="season-muted">
            Earn XP in lessons and duels to reach the next stage. Rewards unlock on their own and stay yours after the month ends.
          </p>
        </div>

        <div className="season-progress">
          <div className="season-progress-top">
            <span className="season-stage-label">STAGE</span>
            <span className="season-stage">
              {season.stage}
              <span className="season-stage-max">/{season.stages}</span>
            </span>
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
          <p className="season-muted">
            {maxed ? 'All stages reached this month.' : `${season.xpPerStage - intoStage} XP to stage ${season.stage + 1}`} ·{' '}
            {season.seasonXp} XP this month
          </p>
        </div>
      </section>

      <section className="season-tracks" aria-label="Rewards">
        <div className="season-track-labels">
          <div className="season-track-label is-free">
            <span>Free pass</span>
          </div>
          <div className="season-track-label is-premium">
            <span>Premium pass</span>
            {!season.isPremium && (
              <button type="button" className="season-premium-button" onClick={onOpenPremium}>
                Get Premium
              </button>
            )}
          </div>
        </div>

        <div className="season-scroll">
          <ol className="season-grid" style={{ gridTemplateColumns: `repeat(${season.stages}, 120px)` }}>
            {stages.map((stage) => (
              <li key={stage} className="season-column">
                <RewardCard reward={rewardAt(stage, 'free')} reached={stage <= season.stage} premium={season.isPremium} />
                <span className={`season-stage-pill${stage <= season.stage ? ' is-reached' : ''}`}>{stage}</span>
                <RewardCard reward={rewardAt(stage, 'premium')} reached={stage <= season.stage} premium={season.isPremium} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

function RewardCard({ reward, reached, premium }: { reward: SeasonReward | undefined; reached: boolean; premium: boolean }) {
  if (!reward) return <div className="season-card is-empty" aria-hidden="true" />

  // PLACEHOLDER visuals: the avatar picture or the tag's icon and label from the frontend catalogs
  const avatar = reward.kind === 'avatar' ? findAvatar(Number(reward.key)) : undefined
  const tag = reward.kind === 'tag' ? findTag(reward.key) : undefined
  const name = avatar?.label ?? tag?.label ?? reward.key
  const needsPremium = reward.track === 'premium' && !premium
  const state = reward.unlocked ? 'is-unlocked' : needsPremium ? 'is-premium-locked' : reached ? '' : 'is-ahead'

  return (
    <div className={`season-card is-${reward.track} ${state}`}>
      <span className="season-card-art">
        {avatar ? <AvatarPicture avatar={avatar} nickname="" /> : <i className={`ti ${tag?.icon ?? 'ti-tag'}`} aria-hidden="true" />}
      </span>
      <span className="season-card-name">{name}</span>
      <span className="season-card-kind">{reward.kind === 'avatar' ? 'Avatar' : 'Tag'}</span>
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
