import { useState } from 'react'
import {
  CATEGORIES,
  type Category,
  type HttpMethod,
  type Lesson,
  type LessonBlock,
  type QuizQuestion,
} from '../learn/content'
import { LessonBlockView, Reveal } from '../learn/LessonBlocks'
import mascotUrl from '../assets/mascot-lightbulb.webp'
import mascotCategoryUrl from '../assets/mascot-category.webp'
import { loadCompletedLessons, saveCompletedLesson } from '../learn/progress'
import { groupLessons } from '../learn/topics'
import './LearnPage.css'

interface LearnPageProps {
  onBack: () => void
}

function LearnPage({ onBack }: LearnPageProps) {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)

  const category = CATEGORIES.find((item) => item.id === categoryId)
  const lesson = category?.lessons.find((item) => item.id === lessonId)
  const [quizOpen, setQuizOpen] = useState(false)
  const [completed, setCompleted] = useState<string[]>(loadCompletedLessons)

  if (category && lesson && quizOpen && lesson.quiz) {
    return (
      <QuizView
        lesson={lesson}
        quiz={lesson.quiz}
        onBack={() => setQuizOpen(false)}
        onExit={() => {
          setQuizOpen(false)
          setLessonId(null)
        }}
        onComplete={() => setCompleted(saveCompletedLesson(lesson.id, completed))}
      />
    )
  }

  if (category && lesson) {
    return (
      <LessonView
        category={category}
        lesson={lesson}
        onBack={() => setLessonId(null)}
        onStartQuiz={() => setQuizOpen(true)}
      />
    )
  }

  if (category) {
    return (
      <LessonListView
        category={category}
        completed={completed}
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
        <div className="learn-title-row">
          <h1 id="learn-title" className="learn-title">
            Learn
          </h1>
          <img className="learn-mascot" src={mascotUrl} alt="" />
        </div>

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
  completed: string[]
  onSelectLesson: (id: string) => void
  onBack: () => void
}

function LessonListView({ category, completed, onSelectLesson, onBack }: LessonListViewProps) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()

  // Keep only the lessons whose title matches, and drop topics left empty
  const groups = groupLessons(category)
    .map(({ topic, lessons }) => ({
      topic,
      lessons: search ? lessons.filter((lesson) => lesson.title.toLowerCase().includes(search)) : lessons,
    }))
    .filter(({ lessons }) => lessons.length > 0)

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
          <div className="learn-title-row">
            <h1 id="learn-title" className="learn-title">
              {category.title}
            </h1>
            <img className="learn-mascot" src={mascotCategoryUrl} alt="" />
          </div>
          <input
            type="search"
            className="learn-search"
            placeholder="Search lessons"
            aria-label="Search lessons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {groups.length === 0 && <p className="learn-search-empty">No lessons match “{query.trim()}”.</p>}

        {/* Lessons are independent, so they're grouped by topic instead of numbered */}
        {groups.map(({ topic, lessons }) => (
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
                    <span className="learn-lesson-card-title">
                      {lesson.title}
                      {completed.includes(lesson.id) && (
                        <span className="learn-lesson-done">
                          <i className="ti ti-circle-check" aria-hidden="true" />
                          Done
                        </span>
                      )}
                    </span>
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
  onStartQuiz: () => void
}

// Splits the blocks at each section heading, so every part of the lesson can get its own background
function splitIntoParts(blocks: LessonBlock[]): LessonBlock[][] {
  const parts: LessonBlock[][] = []
  for (const block of blocks) {
    if (block.type === 'section' || parts.length === 0) parts.push([])
    parts[parts.length - 1].push(block)
  }
  return parts
}

// Smooth scrolling is skipped for people who asked the system to reduce motion
function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function LessonView({ category, lesson, onBack, onStartQuiz }: LessonViewProps) {
  const parts = splitIntoParts(lesson.blocks)

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
        {parts.map((part, partIndex) => (
          <section key={partIndex} className={partIndex % 2 === 0 ? 'lesson-part is-light' : 'lesson-part'}>
            {part.map((block, blockIndex) => (
              <Reveal key={blockIndex}>
                <LessonBlockView block={block} />
              </Reveal>
            ))}
          </section>
        ))}
        {lesson.quiz && (
          <button type="button" className="learn-quiz-start" onClick={onStartQuiz}>
            <i className="ti ti-bolt" aria-hidden="true" />
            Start the quiz
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        )}
      </article>

      <button type="button" className="learn-to-top" aria-label="Back to top" onClick={scrollToTop}>
        <i className="ti ti-arrow-up" aria-hidden="true" />
      </button>
    </main>
  )
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

interface QuizViewProps {
  lesson: Lesson
  quiz: QuizQuestion[]
  onBack: () => void
  onExit: () => void
  onComplete: () => void
}

// One question per step. Each answer is checked right away, with a text label next to the color.
function QuizView({ lesson, quiz, onBack, onExit, onComplete }: QuizViewProps) {
  const [answers, setAnswers] = useState<(HttpMethod | null)[]>(() => quiz.map(() => null))
  const [index, setIndex] = useState(0)

  const finished = index === quiz.length
  const question = quiz[index]
  const chosen = finished ? null : answers[index]
  const isCorrect = !finished && chosen === question.answer
  const score = answers.filter((answer, position) => answer === quiz[position].answer).length

  function choose(method: HttpMethod) {
    setAnswers(answers.map((answer, position) => (position === index ? method : answer)))
  }

  function restart() {
    setAnswers(quiz.map(() => null))
    setIndex(0)
  }

  // The lesson counts as done only when every answer is right, including the last one just chosen
  function next() {
    if (index === quiz.length - 1 && score === quiz.length) onComplete()
    setIndex(index + 1)
  }

  return (
    <main className="learn">
      <header className="learn-header">
        <button type="button" className="learn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back to lesson
        </button>
        <span className="learn-logo">DevBrawl</span>
      </header>

      <section className="learn-quiz" aria-labelledby="quiz-title">
        <p className="learn-lesson-category">{lesson.title}</p>
        <h1 id="quiz-title" className="learn-quiz-title">
          Quiz
        </h1>

        {finished ? (
          <div className="learn-quiz-step">
            {score === quiz.length ? (
              <>
                <p className="learn-quiz-congrats">Congratulations!</p>
                <p className="learn-quiz-scenario">All {quiz.length} answers are right. This lesson is marked as done.</p>
              </>
            ) : (
              <>
                <p className="learn-quiz-scenario">
                  You got {score} of {quiz.length} right.
                </p>
                <p className="learn-quiz-progress">Get them all right to mark this lesson as done.</p>
              </>
            )}
            <div className="learn-quiz-actions">
              {score !== quiz.length && (
                <button type="button" className="learn-quiz-next" onClick={restart}>
                  Try again
                </button>
              )}
              <button type="button" className="lesson-visual-button" onClick={onExit}>
                Back to lessons
              </button>
            </div>
          </div>
        ) : (
          <div className="learn-quiz-step">
            <p className="learn-quiz-progress">
              Question {index + 1} of {quiz.length}
            </p>
            <p className="learn-quiz-scenario">{question.scenario}</p>

            <div className="learn-quiz-choices">
              {METHODS.map((method) => {
                const state = chosen === method ? (isCorrect ? ' is-correct' : ' is-wrong') : ''
                return (
                  <button
                    key={method}
                    type="button"
                    className={`learn-quiz-choice${state}`}
                    disabled={chosen !== null}
                    onClick={() => choose(method)}
                  >
                    {method}
                  </button>
                )
              })}
            </div>

            {chosen !== null && (
              <p className={`learn-quiz-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <i className={`ti ${isCorrect ? 'ti-check' : 'ti-x'}`} aria-hidden="true" />
                <span className="learn-quiz-verdict">
                  {isCorrect ? 'Correct.' : `Not quite. It is ${question.answer}.`}
                </span>
                {question.explanation}
              </p>
            )}

            <div className="learn-quiz-actions">
              <button
                type="button"
                className="learn-quiz-next"
                disabled={chosen === null}
                onClick={next}
              >
                {index === quiz.length - 1 ? 'See result' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default LearnPage
