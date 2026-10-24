import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getProfile, type Profile, type ProfileDuel, type ProfileRating } from '../api/profiles'
import AccountSettings from '../profile/AccountSettings'
import { AccuracyBars, RatingDotPlot, RecordBar, XpMeter } from '../profile/ProfileCharts'
import {
  CHALLENGE_TYPE_LABELS,
  TIER_LABELS,
  formatDateTime,
  formatDelta,
  formatMonthYear,
} from '../profile/format'
import './ProfilePage.css'

interface ProfilePageProps {
  // Another player's profile; the logged-in player's own when undefined
  userId?: string
  onBack: () => void
  onOpenProfile: (userId: string) => void
  onStartDuel: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile }

function ProfilePage({ userId, onBack, onOpenProfile, onStartDuel }: ProfilePageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // The page is remounted for each player (key in App), so it only loads again on retry
  useEffect(() => {
    let cancelled = false
    getProfile(userId)
      .then((profile) => {
        if (!cancelled) setState({ status: 'ready', profile })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof ApiError ? error.message : "Couldn't load the profile. Try again."
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  return (
    <main className="profile">
      <header className="profile-header">
        <button type="button" className="profile-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="profile-logo">DevBrawl</span>
      </header>

      {state.status === 'loading' && <p className="profile-status">Loading profile…</p>}

      {state.status === 'error' && (
        <div className="profile-status">
          <p className="profile-error">{state.message}</p>
          <button
            type="button"
            className="profile-button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <ProfileView
          profile={state.profile}
          onOpenProfile={onOpenProfile}
          onStartDuel={onStartDuel}
          // Reloads in place: the current profile stays on screen until the new one arrives
          onReload={() => setAttempt((n) => n + 1)}
        />
      )}
    </main>
  )
}

interface ProfileViewProps {
  profile: Profile
  onOpenProfile: (userId: string) => void
  onStartDuel: () => void
  onReload: () => void
}

function ProfileView({ profile, onOpenProfile, onStartDuel, onReload }: ProfileViewProps) {
  const { user, progress, duels, accuracy } = profile
  const categoryName = new Map(profile.ratings.map((r) => [r.categoryId, r.name]))
  const winRate = duels.played > 0 ? Math.round((duels.wins / duels.played) * 100) : null
  const overallAccuracy =
    accuracy.overall.total > 0 ? Math.round((accuracy.overall.correct / accuracy.overall.total) * 100) : null

  return (
    <div className="profile-content">
      <section className="profile-hero" aria-labelledby="profile-title">
        <span className="profile-avatar" aria-hidden="true">
          {user.nickname.charAt(0).toUpperCase()}
        </span>
        <div className="profile-identity">
          <p className="profile-eyebrow">
            {profile.isYou ? 'Your profile' : 'Player profile'} · member since {formatMonthYear(user.memberSince)}
          </p>
          <h1 id="profile-title" className="profile-title">
            {user.nickname}
          </h1>
          {profile.isYou && (
            <div className="profile-identity-actions">
              <AccountSettings onNicknameChanged={onReload} />
            </div>
          )}
        </div>
        <div className="profile-level">
          <span className="profile-level-label">LEVEL</span>
          <span className="profile-level-value">{progress.level}</span>
          <XpMeter {...progress} />
        </div>
      </section>

      <section className="profile-section" aria-labelledby="ratings-title">
        <div className="profile-section-head">
          <h2 id="ratings-title" className="profile-section-title">
            Ratings
          </h2>
          <p className="profile-section-note">Each category has its own rating. Only duels change it.</p>
        </div>
        <div className="profile-panel">
          <RatingDotPlot
            rows={profile.ratings.map((rating) => ({
              key: rating.categoryId,
              label: rating.name,
              rating: rating.rating,
              detail: <RatingDetail rating={rating} />,
              badge:
                rating.categoryId === profile.strongestCategoryId
                  ? 'strongest'
                  : rating.categoryId === profile.weakestCategoryId
                    ? 'weakest'
                    : null,
            }))}
          />
        </div>
      </section>

      <div className="profile-columns">
        <section className="profile-section" aria-labelledby="record-title">
          <h2 id="record-title" className="profile-section-title">
            Duel record
          </h2>
          {duels.played === 0 ? (
            <EmptyState
              icon="ti-swords"
              text={profile.isYou ? 'No duels yet.' : `${user.nickname} hasn't finished a duel yet.`}
              action={profile.isYou ? { label: 'Start a duel', onClick: onStartDuel } : undefined}
            />
          ) : (
            <div className="profile-panel">
              <dl className="profile-stats">
                <div>
                  <dt>Duels</dt>
                  <dd>{duels.played}</dd>
                </div>
                <div>
                  <dt>Win rate</dt>
                  <dd>{winRate}%</dd>
                </div>
                <div>
                  <dt>Accuracy</dt>
                  <dd>{overallAccuracy === null ? '–' : `${overallAccuracy}%`}</dd>
                </div>
              </dl>
              <RecordBar wins={duels.wins} draws={duels.draws} losses={duels.losses} />
            </div>
          )}
        </section>

        <section className="profile-section" aria-labelledby="history-title">
          <h2 id="history-title" className="profile-section-title">
            Recent duels
          </h2>
          {profile.recentDuels.length === 0 ? (
            <EmptyState icon="ti-history" text="Finished duels show up here." />
          ) : (
            <ol className="profile-duels">
              {profile.recentDuels.map((duel) => (
                <DuelRow key={duel.id} duel={duel} onOpenProfile={onOpenProfile} />
              ))}
            </ol>
          )}
        </section>
      </div>

      {accuracy.overall.total > 0 && (
        <section className="profile-section" aria-labelledby="accuracy-title">
          <div className="profile-section-head">
            <h2 id="accuracy-title" className="profile-section-title">
              Accuracy
            </h2>
            <p className="profile-section-note">
              {accuracy.overall.correct} of {accuracy.overall.total} duel rounds answered correctly. No answer counts as
              wrong.
            </p>
          </div>
          <div className="profile-columns">
            <div className="profile-panel">
              <h3 className="profile-panel-title">By challenge type</h3>
              <AccuracyBars
                label="Accuracy by challenge type"
                rows={accuracy.byType.map((a) => ({
                  key: a.type,
                  label: CHALLENGE_TYPE_LABELS[a.type],
                  correct: a.correct,
                  total: a.total,
                }))}
              />
            </div>
            <div className="profile-panel">
              <h3 className="profile-panel-title">By category</h3>
              <AccuracyBars
                label="Accuracy by category"
                rows={accuracy.byCategory.map((a) => ({
                  key: String(a.categoryId),
                  label: categoryName.get(a.categoryId) ?? 'Unknown',
                  correct: a.correct,
                  total: a.total,
                }))}
              />
            </div>
          </div>
        </section>
      )}

    </div>
  )
}

// Tier and the change from the last duel that touched this category
function RatingDetail({ rating }: { rating: ProfileRating }) {
  const delta = rating.lastDelta
  return (
    <>
      <span>{TIER_LABELS[rating.tier]}</span>
      {typeof delta === 'number' && delta !== 0 && (
        <span className={`rating-delta ${delta > 0 ? 'is-up' : 'is-down'}`}>
          <i className={`ti ${delta > 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right'}`} aria-hidden="true" />
          {formatDelta(delta)}
          <span className="profile-sr-only"> in the last rated duel</span>
        </span>
      )}
    </>
  )
}

const RESULT_LABELS = { won: 'Won', lost: 'Lost', draw: 'Draw' } as const
const RESULT_ICONS = { won: 'ti-trophy', lost: 'ti-x', draw: 'ti-equal' } as const

function DuelRow({ duel, onOpenProfile }: { duel: ProfileDuel; onOpenProfile: (userId: string) => void }) {
  return (
    <li className="duel-row">
      <span className={`duel-result is-${duel.result}`}>
        <i className={`ti ${RESULT_ICONS[duel.result]}`} aria-hidden="true" />
        {RESULT_LABELS[duel.result]}
      </span>
      <span className="duel-opponent">
        vs{' '}
        <button type="button" className="duel-opponent-link" onClick={() => onOpenProfile(duel.opponent.id)}>
          {duel.opponent.nickname}
        </button>
      </span>
      <span className="duel-score">
        {duel.yourScore}:{duel.opponentScore}
      </span>
      <span className={`duel-delta${duel.ratingDelta > 0 ? ' is-up' : duel.ratingDelta < 0 ? ' is-down' : ''}`}>
        {formatDelta(duel.ratingDelta)}
        <span className="profile-sr-only"> rating</span>
      </span>
      <time className="duel-time" dateTime={duel.finishedAt}>
        {formatDateTime(duel.finishedAt)}
      </time>
    </li>
  )
}

interface EmptyStateProps {
  icon: string
  text: string
  action?: { label: string; onClick: () => void }
}

function EmptyState({ icon, text, action }: EmptyStateProps) {
  return (
    <div className="profile-empty">
      <i className={`ti ${icon}`} aria-hidden="true" />
      <p>{text}</p>
      {action && (
        <button type="button" className="profile-button is-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export default ProfilePage
