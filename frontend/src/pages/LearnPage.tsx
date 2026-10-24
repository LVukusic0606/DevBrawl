import { useState } from 'react'
import { CATEGORIES, type Category, type Lesson } from '../learn/content'
import { LessonBlockView } from '../learn/LessonBlocks'
import { groupLessons, lessonSummary } from '../learn/topics'
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
                <span className="learn-tile-main">
                  <span className="learn-tile-icon" aria-hidden="true">
                    <i className={`ti ${item.icon}`} />
                  </span>
                  <span className="learn-tile-title">{item.title}</span>
                </span>
                <span className="learn-tile-meta">
                  {item.lessons.length} lessons
                  <i className="ti ti-arrow-right learn-tile-arrow" aria-hidden="true" />
                </span>
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
          <h1 id="learn-title" className="learn-title">
            {category.title}
          </h1>
        </div>

        {/* Lessons are independent, so they're grouped by topic instead of numbered */}
        {groupLessons(category).map(({ topic, lessons }) => (
          <section key={topic.name} className="learn-topic" aria-labelledby={`topic-${topic.name}`}>
            <header className="learn-topic-header">
              <span className="learn-topic-icon" aria-hidden="true">
                <i className={`ti ${topic.icon}`} />
              </span>
              <div className="learn-topic-text">
                <h2 id={`topic-${topic.name}`} className="learn-topic-name">
                  {topic.name}
                </h2>
                {topic.description && <p className="learn-topic-desc">{topic.description}</p>}
              </div>
              <span className="learn-topic-count">{lessons.length} lessons</span>
            </header>

            <ul className="learn-lesson-grid">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className="learn-lesson-card"
                    onClick={() => onSelectLesson(lesson.id)}
                  >
                    <span className="learn-lesson-card-title">{lesson.title}</span>
                    <span className="learn-lesson-card-summary">{lessonSummary(lesson)}</span>
                    <i className="ti ti-arrow-right learn-lesson-card-arrow" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
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
