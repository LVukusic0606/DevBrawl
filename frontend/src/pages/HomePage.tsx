import type { User } from '../api/auth'
import './HomePage.css'

interface HomePageProps {
  user: User
  onLogout: () => void
}

// Placeholder signed-in screen until the learning and duel sections exist
function HomePage({ user, onLogout }: HomePageProps) {
  return (
    <main className="home">
      <header className="home-header">
        <span className="home-logo">DevBrawl</span>
        <button type="button" className="home-logout" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          Log out
        </button>
      </header>

      <section className="home-content">
        <h1 className="home-title">Welcome, {user.nickname}.</h1>
        <p className="home-text">You're logged in as {user.email}.</p>
      </section>
    </main>
  )
}

export default HomePage
