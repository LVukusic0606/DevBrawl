import { lazy, Suspense, useEffect, useState } from 'react'
import { getMe, googleLogin, login, logout, signup, type User } from './api/auth'
import { clearSession, loadSession, startSession } from './api/session'
import AuthPage, { type GoogleOutcome, type LoginValues, type SignupValues } from './pages/AuthPage'
import InterviewPage from './pages/InterviewPage'
import DuelPage from './pages/DuelPage'
import LeaderboardPage from './pages/LeaderboardPage'
import PremiumPage from './pages/PremiumPage'
import SeasonPage from './pages/SeasonPage'
import LearnPage from './pages/LearnPage'
import MainPage, { type MainSection } from './pages/MainPage'
import ProfilePage from './pages/ProfilePage'

// three.js is large, so the 3D character page loads only when it's opened
const CharacterPage = lazy(() => import('./pages/CharacterPage'))

type AuthState =
  | { status: 'checking' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

type Screen =
  | 'main'
  | 'learn'
  | 'interview'
  | 'duel'
  | 'profile'
  | 'leaderboard'
  | 'character'
  | 'season'
  | 'premium'

function App() {
  const [auth, setAuth] = useState<AuthState>(() =>
    loadSession() ? { status: 'checking' } : { status: 'signedOut' },
  )
  const [screen, setScreen] = useState<Screen>('main')
  // Whose profile is open; undefined is the logged-in player's own
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined)
  // Where Back on a profile goes: the screen it was opened from
  const [profileReturn, setProfileReturn] = useState<Screen>('main')

  // A stored session may have expired or been revoked, so confirm it with the backend
  useEffect(() => {
    if (auth.status !== 'checking') return
    let cancelled = false

    getMe()
      .then((user) => {
        if (!cancelled) setAuth({ status: 'signedIn', user })
      })
      .catch(() => {
        if (cancelled) return
        // A rejected session is cleared by getMe; if it's still here the backend was just unreachable
        const session = loadSession()
        setAuth(session ? { status: 'signedIn', user: session.user } : { status: 'signedOut' })
      })

    return () => {
      cancelled = true
    }
  }, [auth.status])

  async function handleLogin(values: LoginValues) {
    const response = await login(values.email, values.password)
    startSession(response, values.rememberMe)
    setAuth({ status: 'signedIn', user: response.user })
  }

  async function handleSignup(values: SignupValues) {
    const response = await signup(values)
    startSession(response, false)
    setAuth({ status: 'signedIn', user: response.user })
  }

  function handleLogout() {
    const session = loadSession()
    clearSession()
    setAuth({ status: 'signedOut' })
    setScreen('main')
    // Best effort: the tokens are already gone locally
    if (session) logout(session.refreshToken).catch(() => {})
  }

  // The profile page can change the nickname and the avatar, so the header picks up the new ones
  function leaveProfile() {
    setScreen(profileReturn)
    getMe()
      .then((user) => setAuth({ status: 'signedIn', user }))
      .catch(() => {})
  }

  function openProfile(userId?: string) {
    setProfileUserId(userId)
    // Moving between profiles keeps the original place to go back to
    if (screen !== 'profile') setProfileReturn(screen)
    setScreen('profile')
  }

  async function handleGoogle(idToken: string, username: string | undefined, rememberMe: boolean): Promise<GoogleOutcome> {
    const response = await googleLogin(idToken, username)
    if (response.status === 'nicknameRequired' || !response.auth) {
      return { status: 'usernameRequired', email: response.email ?? '', suggestedUsername: response.suggestedNickname ?? '' }
    }
    startSession(response.auth, rememberMe)
    setAuth({ status: 'signedIn', user: response.auth.user })
    return { status: 'loggedIn' }
  }

  function handleSelect(section: MainSection) {
    setScreen(section)
  }

  if (auth.status === 'checking') return null

  if (auth.status === 'signedOut') {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} onGoogle={handleGoogle} />
  }

  if (screen === 'duel') {
    return <DuelPage onBack={() => setScreen('main')} />
  }

  if (screen === 'learn') {
    return <LearnPage onBack={() => setScreen('main')} />
  }

  if (screen === 'interview') {
    return <InterviewPage onBack={() => setScreen('main')} />
  }

  if (screen === 'profile') {
    return (
      <ProfilePage
        // A different player gets a fresh page, so state from the previous profile never shows
        key={profileUserId ?? 'me'}
        userId={profileUserId}
        onBack={leaveProfile}
        onOpenProfile={openProfile}
        onStartDuel={() => handleSelect('duel')}
        onOpenCharacter={() => setScreen('character')}
      />
    )
  }

  if (screen === 'character') {
    return (
      <Suspense fallback={null}>
        <CharacterPage onBack={() => setScreen('profile')} />
      </Suspense>
    )
  }

  if (screen === 'leaderboard') {
    return (
      <LeaderboardPage
        onBack={() => setScreen('main')}
        onOpenProfile={openProfile}
        onStartDuel={() => handleSelect('duel')}
      />
    )
  }

  if (screen === 'season') {
    return <SeasonPage onBack={() => setScreen('main')} onOpenPremium={() => setScreen('premium')} />
  }

  if (screen === 'premium') {
    return <PremiumPage onBack={() => setScreen('main')} onOpenSeason={() => setScreen('season')} />
  }

  return (
    <MainPage
      user={auth.user}
      onSelect={handleSelect}
      onLogout={handleLogout}
      onOpenProfile={() => openProfile()}
      onOpenLeaderboard={() => setScreen('leaderboard')}
      onOpenSeason={() => setScreen('season')}
      onOpenPremium={() => setScreen('premium')}
    />
  )
}

export default App
