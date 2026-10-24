import bugDuel from '../assets/bug-duel.webp'
import bugInterview from '../assets/bug-interview.webp'
import bugLearn from '../assets/bug-learn.webp'
import './MainPage.css'

export type MainSection = 'learn' | 'duel' | 'interview'

interface MainPageProps {
  onSelect: (section: MainSection) => void
  onLogout: () => void
}

const SECTIONS: { id: MainSection; label: string; description: string; bug: string }[] = [
  {
    id: 'learn',
    label: 'Learn',
    description: 'Work through programming concepts step by step.',
    bug: bugLearn,
  },
  {
    id: 'duel',
    label: 'Duel',
    description: 'Prove your understanding in a quiz against someone else.',
    bug: bugDuel,
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Answer questions the way you would in a real interview.',
    bug: bugInterview,
  },
]

function MainPage({ onSelect, onLogout }: MainPageProps) {
  return (
    <main className="home">
      <header className="home-header">
        <span className="home-logo">DevBrawl</span>
        <button type="button" className="home-logout" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          Log out
        </button>
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
              <img className="home-action-bug" src={section.bug} alt="" />
              <i className="ti ti-arrow-right home-action-arrow" aria-hidden="true" />
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}

export default MainPage
