import { useState } from 'react'
import './LearnPage.css'

interface Lesson {
  id: string
  title: string
  paragraphs: string[]
}

interface Category {
  id: string
  title: string
  description: string
  icon: string
  lessons: Lesson[]
}

const CATEGORIES: Category[] = [
  {
    id: 'frontend-web',
    title: 'Frontend web development',
    description: 'How pages are built and shown in the browser.',
    icon: 'ti-brand-html5',
    lessons: [
      {
        id: 'browser-page',
        title: 'How a browser shows a page',
        paragraphs: [
          'When you open a website, the browser downloads a document written in HTML. That document describes what is on the page: headings, text, images and buttons.',
          'Styles then decide how those elements look. Colors, spacing and layout come from CSS, which the browser applies on top of the structure.',
          'Scripts make the page react to the user. A click, a typed letter or a timer can change the page without loading a new one.',
        ],
      },
      {
        id: 'html-structure',
        title: 'Structuring content with HTML',
        paragraphs: [
          'HTML is a tree of elements. Each element has a tag that says what it is, such as a heading, a paragraph or a list.',
          'Choosing the right tag matters. A button is a button, not a styled div, because the browser and screen readers know how to handle it.',
        ],
      },
      {
        id: 'layout-flexbox',
        title: 'Arranging elements with flexbox',
        paragraphs: [
          'Flexbox lays out a row or a column of elements. You set the direction on the parent and the browser spaces the children for you.',
          'Gap, alignment and wrapping cover most layouts without manual pixel positions.',
        ],
      },
    ],
  },
  {
    id: 'backend',
    title: 'Backend development',
    description: 'How servers receive requests and send back data.',
    icon: 'ti-server',
    lessons: [
      {
        id: 'server-role',
        title: 'What a server does',
        paragraphs: [
          'A server waits for requests from clients. Each request asks for something, such as a list of lessons or a login.',
          'The server checks the request, does the work and sends back a response. The response is usually data the frontend can display.',
        ],
      },
      {
        id: 'http-methods',
        title: 'Reading and writing with HTTP methods',
        paragraphs: [
          'GET asks for data without changing anything. POST creates something new, and PUT or PATCH changes something that already exists.',
        ],
      },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    description: 'How data is stored, found and kept consistent.',
    icon: 'ti-database',
    lessons: [
      {
        id: 'tables',
        title: 'Why we store data in tables',
        paragraphs: [
          'A database keeps data in tables, where each row is one record and each column is one property of that record.',
          'Tables let us find, sort and update records quickly, and rules on the columns keep the data valid.',
        ],
      },
      {
        id: 'keys',
        title: 'Linking tables with keys',
        paragraphs: [
          'A primary key uniquely identifies each row. A foreign key points to a primary key in another table, which links the two.',
        ],
      },
    ],
  },
  {
    id: 'version-control',
    title: 'Version control',
    description: 'How teams track and combine changes to code.',
    icon: 'ti-git-branch',
    lessons: [
      {
        id: 'commits',
        title: 'Saving history with commits',
        paragraphs: [
          'Version control records every change to a project as a commit. A commit stores what changed, who changed it and a short message about why.',
        ],
      },
      {
        id: 'branches',
        title: 'Working apart with branches',
        paragraphs: [
          'Branches let you work on a change apart from the main code until it is ready to join it.',
        ],
      },
    ],
  },
]

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
        {lesson.paragraphs.map((paragraph) => (
          <p key={paragraph} className="learn-lesson-text">
            {paragraph}
          </p>
        ))}
      </article>
    </main>
  )
}

export default LearnPage
