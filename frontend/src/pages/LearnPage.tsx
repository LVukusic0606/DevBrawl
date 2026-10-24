import { useState } from 'react'
import { CATEGORIES, type Category, type Lesson } from '../learn/content'
import { LessonBlockView } from '../learn/LessonBlocks'
import './LearnPage.css'

interface LearnPageProps {
  onBack: () => void
}

function LearnPage({ onBack }: LearnPageProps) {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)

  const category = CATEGORIES.find((item) => item.id === categoryId)
  const lesson = category?.lessons.find((item) => item.id === lessonId)

  if (category && lesson) {
    return (
      <LessonView
        category={category}
        lesson={lesson}
        onBack={() => setLessonId(null)}
      />
    )
  }

  if (category) {
    return (
      <LessonListView
        category={category}
        onSelectLesson={setLessonId}
        onBack={() => setCategoryId(null)}
      />
    )
  }

  return (
    <main className="learn">
      <header className="learn-header">
        <button type="button" className="learn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="learn-logo">DevBrawl</span>
      </header>

      <section className="learn-content" aria-labelledby="learn-title">
        <h1 id="learn-title" className="learn-title">
          Learn
        </h1>

        <ul className="learn-grid">
          {CATEGORIES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="learn-tile"
                onClick={() => setCategoryId(item.id)}
              >
                <span className="learn-tile-icon" aria-hidden="true">
                  <i className={`ti ${item.icon}`} />
                </span>
                <span className="learn-tile-title">{item.title}</span>
                <span className="learn-tile-desc">{item.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

interface LessonListViewProps {
  category: Category
  onSelectLesson: (id: string) => void
  onBack: () => void
}

function LessonListView({ category, onSelectLesson, onBack }: LessonListViewProps) {
  return (
    <main className="learn">
      <header className="learn-header">
        <button type="button" className="learn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          All categories
        </button>
        <span className="learn-logo">DevBrawl</span>
      </header>

      <section className="learn-content" aria-labelledby="learn-title">
        <div className="learn-heading">
          <p className="learn-eyebrow">{category.description}</p>
          <h1 id="learn-title" className="learn-title">
            {category.title}
          </h1>
        </div>

        <ol className="learn-lessons">
          {category.lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <button
                type="button"
                className="learn-lesson-row"
                onClick={() => onSelectLesson(lesson.id)}
              >
                <span className="learn-lesson-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="learn-lesson-row-title">{lesson.title}</span>
                <i className="ti ti-arrow-right learn-lesson-row-arrow" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

interface LessonViewProps {
  category: Category
  lesson: Lesson
  onBack: () => void
}

function LessonView({ category, lesson, onBack }: LessonViewProps) {
  return (
    <main className="learn">
      <header className="learn-header">
        <button type="button" className="learn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          {category.title}
        </button>
        <span className="learn-logo">DevBrawl</span>
      </header>

      <article className="learn-lesson" aria-labelledby="lesson-title">
        <p className="learn-lesson-category">{category.title}</p>
        <h1 id="lesson-title" className="learn-lesson-title">
          {lesson.title}
        </h1>
        {lesson.blocks.map((block, index) => (
          <LessonBlockView key={index} block={block} />
        ))}
      </article>
    </main>
  )
}

export default LearnPage
