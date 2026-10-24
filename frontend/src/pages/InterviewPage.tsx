import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  createInterviewQuestion,
  getInterviewTopics,
  submitInterviewAnswer,
  transcribeAnswer,
  type AnswerReview,
  type InterviewCategory,
  type InterviewQuestion,
  type Verdict,
} from '../api/interview'
import { canRecord, useWavRecorder } from '../hooks/useWavRecorder'
import './InterviewPage.css'

interface InterviewPageProps {
  onBack: () => void
}

const MAX_ANSWER_LENGTH = 2000
const MAX_RECORDING_SECONDS = 120

// Select values: "" for any lesson, "category:<id>" or "lesson:<id>"
type TopicChoice = string

const VERDICTS: Record<Verdict, { label: string; icon: string }> = {
  correct: { label: 'Correct', icon: 'ti-circle-check' },
  partiallyCorrect: { label: 'Partly correct', icon: 'ti-circle-half-2' },
  incorrect: { label: 'Not quite', icon: 'ti-circle-x' },
}

function InterviewPage({ onBack }: InterviewPageProps) {
  const [topics, setTopics] = useState<InterviewCategory[]>([])
  const [topic, setTopic] = useState<TopicChoice>('')
  const [question, setQuestion] = useState<InterviewQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [review, setReview] = useState<AnswerReview | null>(null)
  const [busy, setBusy] = useState<'question' | 'grading' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInterviewTopics()
      .then(setTopics)
      .catch((e) => setError(messageOf(e)))
  }, [])

  const recorder = useWavRecorder({
    maxSeconds: MAX_RECORDING_SECONDS,
    onError: setError,
    onRecorded: async (wav) => {
      if (!question) return
      try {
        const text = await transcribeAnswer(question.id, wav)
        if (!text) {
          setError("We didn't catch any words. Try recording again.")
          return
        }
        // Spoken text is added to whatever was already typed, so the user can combine both
        setAnswer((current) => (current.trim() ? `${current.trim()} ${text}` : text).slice(0, MAX_ANSWER_LENGTH))
      } catch (e) {
        setError(messageOf(e))
      }
    },
  })

  async function askQuestion() {
    setBusy('question')
    setError(null)
    try {
      const [kind, id] = topic.split(':')
      const next = await createInterviewQuestion(
        kind === 'lesson' ? { lessonId: id } : kind === 'category' ? { categoryId: id } : {},
      )
      setQuestion(next)
      setAnswer('')
      setReview(null)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return
    setBusy('grading')
    setError(null)
    try {
      setReview(await submitInterviewAnswer(question.id, answer.trim()))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  function changeTopic() {
    setQuestion(null)
    setReview(null)
    setAnswer('')
    setError(null)
  }

  const recording = recorder.status === 'recording'
  const transcribing = recorder.status === 'processing'

  return (
    <main className="interview">
      <header className="interview-header">
        <button type="button" className="interview-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <span className="interview-logo">DevBrawl</span>
      </header>

      <section className="interview-content" aria-labelledby="interview-title">
        <div className="interview-intro">
          <h1 id="interview-title" className="interview-title">
            Interview
          </h1>
          <p className="interview-lead">
            Answer in your own words, by typing or speaking. You get feedback right after.
          </p>
        </div>

        {!question && (
          <div className="interview-panel">
            <label className="interview-label" htmlFor="interview-topic">
              Topic
            </label>
            <select
              id="interview-topic"
              className="interview-select"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={busy !== null}
            >
              <option value="">Any lesson</option>
              {topics.map((category) => (
                <optgroup key={category.id} label={category.title}>
                  <option value={`category:${category.id}`}>Any {category.title.toLowerCase()} lesson</option>
                  {category.lessons.map((lesson) => (
                    <option key={lesson.id} value={`lesson:${lesson.id}`}>
                      {lesson.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" className="interview-primary" onClick={askQuestion} disabled={busy !== null}>
              {busy === 'question' ? 'Preparing a question…' : 'Ask me a question'}
            </button>
          </div>
        )}

        {question && (
          <article className="interview-panel" aria-live="polite">
            <p className="interview-meta">
              {question.categoryTitle} · {question.lessonTitle}
            </p>
            <h2 className="interview-question">{question.question}</h2>

            {!review && (
              <>
                <textarea
                  className="interview-answer"
                  aria-label="Your answer"
                  placeholder={
                    canRecord ? 'Type your answer, or record it with the microphone.' : 'Type your answer.'
                  }
                  value={answer}
                  maxLength={MAX_ANSWER_LENGTH}
                  rows={6}
                  disabled={busy !== null || transcribing}
                  onChange={(event) => setAnswer(event.target.value)}
                />

                <div className="interview-controls">
                  {canRecord && (
                    <button
                      type="button"
                      className={`interview-secondary${recording ? ' is-recording' : ''}`}
                      onClick={recording ? recorder.stop : recorder.start}
                      disabled={busy !== null || transcribing}
                      aria-pressed={recording}
                    >
                      <i className={`ti ${recording ? 'ti-player-stop' : 'ti-microphone'}`} aria-hidden="true" />
                      {recording
                        ? `Stop ${formatTime(recorder.seconds)}`
                        : transcribing
                          ? 'Turning speech into text…'
                          : 'Record answer'}
                    </button>
                  )}
                  <span className="interview-count">
                    {answer.length} / {MAX_ANSWER_LENGTH}
                  </span>
                  <button
                    type="button"
                    className="interview-primary"
                    onClick={submitAnswer}
                    disabled={!answer.trim() || busy !== null || recording || transcribing}
                  >
                    {busy === 'grading' ? 'Grading your answer…' : 'Submit answer'}
                  </button>
                </div>

                {recording && (
                  <p className="interview-hint">
                    Recording. Speak your answer, then press Stop (up to {MAX_RECORDING_SECONDS / 60} minutes).
                  </p>
                )}
              </>
            )}

            {review && <ReviewView review={review} answer={answer} onNext={askQuestion} onChangeTopic={changeTopic} busy={busy !== null} />}
          </article>
        )}

        {error && (
          <p className="interview-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}

interface ReviewViewProps {
  review: AnswerReview
  answer: string
  busy: boolean
  onNext: () => void
  onChangeTopic: () => void
}

function ReviewView({ review, answer, busy, onNext, onChangeTopic }: ReviewViewProps) {
  const verdict = VERDICTS[review.verdict]

  return (
    <div className="interview-review">
      <p className={`interview-verdict is-${review.verdict}`}>
        <i className={`ti ${verdict.icon}`} aria-hidden="true" />
        {verdict.label}
        <span className="interview-score">{review.score} / 100</span>
      </p>
      <p className="interview-feedback">{review.feedback}</p>

      {review.strengths.length > 0 && (
        <section>
          <h3 className="interview-subtitle">What you got right</h3>
          <ul className="interview-list">
            {review.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {review.improvements.length > 0 && (
        <section>
          <h3 className="interview-subtitle">What to improve</h3>
          <ul className="interview-list">
            {review.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="interview-subtitle">Model answer</h3>
        <p className="interview-quote">{review.modelAnswer}</p>
      </section>

      <section>
        <h3 className="interview-subtitle">Your answer</h3>
        <p className="interview-quote is-muted">{answer}</p>
      </section>

      <div className="interview-controls">
        <button type="button" className="interview-secondary" onClick={onChangeTopic} disabled={busy}>
          Change topic
        </button>
        <button type="button" className="interview-primary" onClick={onNext} disabled={busy}>
          {busy ? 'Preparing a question…' : 'Next question'}
        </button>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function messageOf(error: unknown) {
  return error instanceof ApiError ? error.message : "Couldn't connect. Try again."
}

export default InterviewPage
