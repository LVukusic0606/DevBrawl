import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getProfile, type Profile, type ProfileDuel, type ProfileRating } from '../api/profiles'
import { CATEGORIES } from '../learn/content'
import ScrollReveal from '../components/ScrollReveal'
import AccountSettings from '../profile/AccountSettings'
import { drawProfileCard } from '../share/cards'
import { ShareButton } from '../share/ShareButton'
import ProfileAvatar from '../profile/ProfileAvatar'
import ProfileTag from '../profile/ProfileTag'
import { StreakBadge } from '../profile/StreakBadge'
import { AccuracyBars, RatingDotPlot, RecordBar, XpMeter } from '../profile/ProfileCharts'
import {
  CHALLENGE_TYPE_LABELS,
  TIER_LABELS,
  formatDate,
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
  onOpenCharacter: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile }

function ProfilePage({ userId, onBack, onOpenProfile, onStartDuel, onOpenCharacter }: ProfilePageProps) {
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
          onOpenCharacter={onOpenCharacter}
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
  onOpenCharacter: () => void
  onReload: () => void
}

function ProfileView({ profile, onOpenProfile, onStartDuel, onOpenCharacter, onReload }: ProfileViewProps) {
  const { user, progress, duels, accuracy } = profile
  const categoryName = new Map(profile.ratings.map((r) => [r.categoryId, r.name]))
  const winRate = duels.played > 0 ? Math.round((duels.wins / duels.played) * 100) : null
  const overallAccuracy =
    accuracy.overall.total > 0 ? Math.round((accuracy.overall.correct / accuracy.overall.total) * 100) : null

  return (
    <div className="profile-content">
      <section className="profile-hero" aria-labelledby="profile-title">
        <ProfileAvatar
          nickname={user.nickname}
          avatarId={user.avatarId}
          editable={profile.isYou}
          onChanged={onReload}
        />
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1 id="profile-title" className="profile-title">
              {user.nickname}
            </h1>
            <ProfileTag tag={user.tag} editable={profile.isYou} onChanged={onReload} />
            <StreakBadge
              current={profile.streak.current}
              best={profile.streak.best}
              // Other players don't need the "today is missing" hint
              activeToday={profile.isYou ? profile.streak.activeToday : true}
            />
          </div>
        </div>
        <div className="profile-hero-stats">
          <div className="profile-level is-overall">
            <span className="profile-level-label">OVERALL RATING</span>
            <span className="profile-level-value">{profile.overall.rating}</span>
          </div>
          <div className="profile-level">
            <span className="profile-level-label">LEVEL</span>
            <span className="profile-level-value">{progress.level}</span>
            <XpMeter {...progress} />
          </div>
        </div>
        {/* The account buttons sit on their own row under the stats, away from the name */}
        {profile.isYou && (
          <div className="profile-identity-actions">
            <AccountSettings onNicknameChanged={onReload} />
            <ShareButton
              label="Share profile"
              fileName={`devbrawl-${user.nickname}`}
              shareText={`My DevBrawl stats: overall rating ${profile.overall.rating}.`}
              render={() => drawProfileCard(profile)}
              className="profile-button"
            />
          </div>
        )}
      </section>

      {/* A wide banner right under the hero, so the 3D character is the first thing to try.
          Only its button is interactive. */}
      {profile.isYou && (
        <div className="profile-character">
          <div className="profile-character-text">
            <span className="profile-character-label">YOUR CHARACTER</span>
            <span className="profile-character-title">Check out your bug in 3D</span>
          </div>
          <button type="button" className="profile-character-cta" onClick={onOpenCharacter}>
            3D view
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      )}

      <ScrollReveal>
        <section className="profile-section" aria-labelledby="ratings-title">
          <div className="profile-section-head">
            <h2 id="ratings-title" className="profile-section-title">
              Ratings
            </h2>
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
      </ScrollReveal>

      <ScrollReveal>
        <LessonProgress completedLessonIds={profile.learning.completedLessonIds} />
      </ScrollReveal>

      <ScrollReveal>
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
      </ScrollReveal>

      {accuracy.overall.total > 0 && (
        <ScrollReveal>
          <section className="profile-section" aria-labelledby="accuracy-title">
            <div className="profile-section-head">
              <h2 id="accuracy-title" className="profile-section-title">
                Accuracy
              </h2>
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
        </ScrollReveal>
      )}

      <ScrollReveal>
        <p className="profile-joined">
          <i className="ti ti-calendar" aria-hidden="true" />
          Joined DevBrawl in {formatMonthYear(user.memberSince)}
        </p>
      </ScrollReveal>
    </div>
  )
}

// Share of lessons finished with a perfect quiz. The backend only knows lesson slugs,
// so the totals come from the lesson catalog here.
function LessonProgress({ completedLessonIds }: { completedLessonIds: string[] }) {
  const completed = new Set(completedLessonIds)
  const rows = CATEGORIES.map((category) => ({
    key: category.id,
    label: category.title,
    correct: category.lessons.filter((lesson) => completed.has(lesson.id)).length,
    total: category.lessons.length,
  }))
  const done = rows.reduce((sum, row) => sum + row.correct, 0)
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <section className="profile-section" aria-labelledby="lessons-title">
      <div className="profile-section-head">
        <h2 id="lessons-title" className="profile-section-title">
          Lessons
        </h2>
      </div>
      <div className="profile-panel is-learning">
        <dl className="profile-stats">
          <div>
            <dt>Completed</dt>
            <dd>{Math.round((done / total) * 100)}%</dd>
          </div>
          <div>
            <dt>Lessons done</dt>
            <dd>
              {done}/{total}
            </dd>
          </div>
        </dl>
        <AccuracyBars label="Lessons completed by category" rows={rows} />
      </div>
    </section>
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
    <li className="profile-duel-row">
      <span className={`profile-duel-result is-${duel.result}`}>
        <i className={`ti ${RESULT_ICONS[duel.result]}`} aria-hidden="true" />
        {RESULT_LABELS[duel.result]}
      </span>
      <span className="profile-duel-opponent">
        vs{' '}
        <button type="button" className="profile-duel-opponent-link" onClick={() => onOpenProfile(duel.opponent.id)}>
          {duel.opponent.nickname}
        </button>
      </span>
      <span className="profile-duel-score">
        {duel.yourScore}:{duel.opponentScore}
      </span>
      <span className={`profile-duel-delta${duel.ratingDelta > 0 ? ' is-up' : duel.ratingDelta < 0 ? ' is-down' : ''}`}>
        {formatDelta(duel.ratingDelta)}
        <span className="profile-sr-only"> rating</span>
      </span>
      <time className="profile-duel-time" dateTime={duel.finishedAt}>
        {formatDate(duel.finishedAt)}
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
