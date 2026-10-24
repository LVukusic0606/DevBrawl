import './MainPage.css'

export type MainSection = 'learn' | 'duel' | 'interview'

interface MainPageProps {
  onSelect: (section: MainSection) => void
}

const SECTIONS: { id: MainSection; label: string; description: string; icon: string }[] = [
  {
    id: 'learn',
    label: 'Learn',
    description: 'Work through programming concepts step by step.',
    icon: 'ti-book-2',
  },
  {
    id: 'duel',
    label: 'Duel',
    description: 'Prove your understanding in a quiz against someone else.',
    icon: 'ti-swords',
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Answer questions the way you would in a real interview.',
    icon: 'ti-message-2',
  },
]

function MainPage({ onSelect }: MainPageProps) {
  return (
    <main className="home">
      <header className="home-header">
        <span className="home-logo">DevBrawl</span>
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
              <span className="home-action-icon" aria-hidden="true">
                <i className={`ti ${section.icon}`} />
              </span>
              <span className="home-action-text">
                <span className="home-action-label">{section.label}</span>
                <span className="home-action-desc">{section.description}</span>
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
