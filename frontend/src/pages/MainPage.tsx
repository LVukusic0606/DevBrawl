import { useEffect, useState } from 'react'
import type { User } from '../api/auth'
import { getFriends } from '../api/friends'
import { getStreak, type Streak } from '../api/streak'
import bugDuel from '../assets/bug-duel.webp'
import bugInterview from '../assets/bug-interview.webp'
import bugLearn from '../assets/bug-learn.webp'
import { AvatarPicture } from '../profile/AvatarPicture'
import { findAvatar } from '../profile/avatars'
import { StreakBadge } from '../profile/StreakBadge'
import './MainPage.css'

export type MainSection = 'learn' | 'duel' | 'interview'

interface MainPageProps {
  user: User
  onSelect: (section: MainSection) => void
  onLogout: () => void
  onOpenProfile: () => void
  onOpenLeaderboard: () => void
  onOpenFriends: () => void
  onOpenSeason: () => void
  onOpenPremium: () => void
}

// bugHead is the horizontal position of the bug's head in its image, from 0 (left) to 1 (right)
const SECTIONS: {
  id: MainSection
  label: string
  description: string
  bug: string
  bugHead: number
}[] = [
  {
    id: 'learn',
    label: 'Learn',
    description: 'Work through programming concepts step by step.',
    bug: bugLearn,
    bugHead: 0.444,
  },
  {
    id: 'duel',
    label: 'Duel',
    description: 'Prove your understanding in a quiz against someone else.',
    bug: bugDuel,
    bugHead: 0.642,
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Answer questions the way you would in a real interview.',
    bug: bugInterview,
    bugHead: 0.467,
  },
]

function MainPage({
  user,
  onSelect,
  onLogout,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenFriends,
  onOpenSeason,
  onOpenPremium,
}: MainPageProps) {
  const [streak, setStreak] = useState<Streak | null>(null)
  // Friend requests waiting for an answer
  const [requests, setRequests] = useState(0)

  // Loads once per visit to the main page; the header simply hides the flame or the count if it fails
  useEffect(() => {
    getStreak()
      .then(setStreak)
      .catch(() => {})
    getFriends()
      .then((friends) => setRequests(friends.incoming.length))
      .catch(() => {})
  }, [])

  const avatar = findAvatar(user.avatarId ?? null)

  return (
    <main className="home">
      <header className="home-header">
        <span className="home-logo">DevBrawl</span>
        <div className="home-header-actions">
          <button type="button" className="home-logout" onClick={onOpenSeason}>
            <i className="ti ti-ticket" aria-hidden="true" />
            Season pass
          </button>
          <button type="button" className="home-logout" onClick={onOpenPremium}>
            <i className="ti ti-crown" aria-hidden="true" />
            Premium
          </button>
          <button type="button" className="home-logout" onClick={onOpenLeaderboard}>
            <i className="ti ti-trophy" aria-hidden="true" />
            Leaderboard
          </button>
          <button type="button" className="home-logout" onClick={onOpenFriends}>
            <i className="ti ti-users" aria-hidden="true" />
            Friends
            {requests > 0 && (
              <span className="home-badge" aria-label={`${requests} new ${requests === 1 ? 'request' : 'requests'}`}>
                {requests}
              </span>
            )}
          </button>
          <button type="button" className="home-logout is-danger" onClick={onLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
            Log out
          </button>
          {streak && <StreakBadge current={streak.current} activeToday={streak.activeToday} variant="compact" />}
          {/* The player's picture, or the first letter of the nickname, opens their profile */}
          <button type="button" className="home-avatar" aria-label="Profile" onClick={onOpenProfile}>
            <AvatarPicture avatar={avatar} nickname={user.nickname} />
          </button>
        </div>
      </header>

      <section className="home-content" aria-labelledby="home-title">
        <h1 id="home-title" className="home-title">
          What do you want to do?
        </h1>

        <nav className="home-actions" aria-label="Sections">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`home-action is-${section.id}`}
              onClick={() => onSelect(section.id)}
            >
              <span className="home-action-text">
                <span className="home-action-label">{section.label}</span>
                <span className="home-action-desc">{section.description}</span>
              </span>
              <span className="home-action-bug-slot">
                {/* Shift each image so the bug's head sits in the middle of the slot. */}
                <img
                  className="home-action-bug"
                  src={section.bug}
                  alt=""
                  style={{ transform: `translateX(${(0.5 - section.bugHead) * 100}%)` }}
                />
              </span>
              <i className="ti ti-arrow-right home-action-arrow" aria-hidden="true" />
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}

export default MainPage
