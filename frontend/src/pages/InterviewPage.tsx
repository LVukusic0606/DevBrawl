import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError } from '../api/client'
import {
  finishInterview,
  getInterview,
  getInterviewTopics,
  listInterviews,
  sendInterviewMessage,
  startInterview,
  transcribeAnswer,
  type InterviewCategory,
  type InterviewEvaluation,
  type InterviewMessage,
  type InterviewSession,
  type InterviewSummary,
} from '../api/interview'
import { canRecord, useWavRecorder } from '../hooks/useWavRecorder'
import './InterviewPage.css'

interface InterviewPageProps {
  onBack: () => void
}

const MAX_ANSWER_LENGTH = 2000
const MAX_RECORDING_SECONDS = 120

// Select values: "" for a random category, "category:<id>" or "lesson:<id>"
type TopicChoice = string

function InterviewPage({ onBack }: InterviewPageProps) {
  const [topics, setTopics] = useState<InterviewCategory[]>([])
  const [topic, setTopic] = useState<TopicChoice>('')
  const [history, setHistory] = useState<InterviewSummary[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  // The answer being sent, shown in the thread until the server confirms it
  const [pending, setPending] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<'starting' | 'sending' | 'finishing' | 'opening' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const threadEnd = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getInterviewTopics().then(setTopics).catch((e) => setError(messageOf(e)))
    listInterviews().then(setHistory).catch(() => {})
  }, [])

  // Keep the newest message in view
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session?.messages.length, pending, busy])

  // Grow the composer with its text, up to the max height set in CSS
  useEffect(() => {
    const box = composer.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight}px`
  }, [draft])

  const recorder = useWavRecorder({
    maxSeconds: MAX_RECORDING_SECONDS,
    onError: setError,
    onRecorded: async (wav) => {
      if (!session) return
      try {
        const text = await transcribeAnswer(session.id, wav)
        if (!text) {
          setError("We didn't catch any words. Try recording again.")
          return
        }
        // Spoken text is added to whatever was already typed
        setDraft((current) => (current.trim() ? `${current.trim()} ${text}` : text).slice(0, MAX_ANSWER_LENGTH))
        composer.current?.focus()
      } catch (e) {
        setError(messageOf(e))
      }
    },
  })

  function refreshHistory() {
    listInterviews().then(setHistory).catch(() => {})
  }

  async function start() {
    setBusy('starting')
    setError(null)
    try {
      const [kind, id] = topic.split(':')
      const started = await startInterview(kind === 'lesson' ? { lessonId: id } : kind === 'category' ? { categoryId: id } : {})
      setSession(started)
      setDraft('')
      refreshHistory()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  async function open(id: string) {
    if (busy) return
    setBusy('opening')
    setError(null)
    try {
      setSession(await getInterview(id))
      setDraft('')
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  async function send() {
    const answer = draft.trim()
    if (!session || !answer || busy) return
    setPending(answer)
    setDraft('')
    setBusy('sending')
    setError(null)
    try {
      const updated = await sendInterviewMessage(session.id, answer)
      setSession(updated)
      if (updated.status === 'finished') refreshHistory()
    } catch (e) {
      // Nothing was saved, so give the answer back to send again
      setDraft(answer)
      setError(messageOf(e))
    } finally {
      setPending(null)
      setBusy(null)
    }
  }

  async function finish() {
    if (!session || busy) return
    setBusy('finishing')
    setError(null)
    try {
      setSession(await finishInterview(session.id))
      refreshHistory()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  function newInterview() {
    if (busy) return
    setSession(null)
    setDraft('')
    setError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter starts a new line
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const active = session?.status === 'active'
  const recording = recorder.status === 'recording'
  const transcribing = recorder.status === 'processing'
  const answered = session?.messages.some((m) => m.role === 'candidate') ?? false

  return (
    <main className={`interview${session ? ' has-session' : ''}`}>
      <aside className="interview-sidebar" aria-label="Interview history">
        <button type="button" className="interview-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Back
        </button>
        <button type="button" className="interview-secondary" onClick={newInterview} disabled={busy !== null}>
          <i className="ti ti-plus" aria-hidden="true" />
          New interview
        </button>
        <h2 className="interview-sidebar-title">History</h2>
        {history.length === 0 ? (
          <p className="interview-muted">No interviews yet.</p>
        ) : (
          <ul className="interview-history">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`interview-history-item${item.id === session?.id ? ' is-current' : ''}`}
                  onClick={() => open(item.id)}
                  disabled={busy !== null}
                >
                  <span className="interview-history-title">{item.title}</span>
                  <span className="interview-history-meta">
                    {formatDate(item.createdAt)} ·{' '}
                    {item.status === 'active' ? 'In progress' : item.score !== null ? `${item.score} / 100` : 'Ended'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="interview-main">
        <header className="interview-header">
          <button type="button" className="interview-back interview-back-mobile" onClick={session ? newInterview : onBack}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back
          </button>
          <div className="interview-heading">
            <span className="interview-logo">{session ? session.title : 'Interview'}</span>
            {session && (
              <span className="interview-progress">
                {active ? `Answer ${Math.min(session.answersGiven + 1, session.maxAnswers)} of ${session.maxAnswers}` : 'Finished'}
              </span>
            )}
          </div>
          {active && (
            <button type="button" className="interview-secondary" onClick={finish} disabled={busy !== null || recording}>
              {busy === 'finishing' ? 'Ending…' : 'End interview'}
            </button>
          )}
        </header>

        {!session ? (
          <div className="interview-start">
            <h1 className="interview-title">Interview</h1>
            <p className="interview-lead">
              Talk through a topic with an AI interviewer. Answer in your own words, by typing or speaking, and get feedback at
              the end.
            </p>
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
              <option value="">Surprise me</option>
              {topics.map((category) => (
                <optgroup key={category.id} label={category.title}>
                  <option value={`category:${category.id}`}>All of {category.title}</option>
                  {category.lessons.map((lesson) => (
                    <option key={lesson.id} value={`lesson:${lesson.id}`}>
                      {lesson.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" className="interview-primary" onClick={start} disabled={busy !== null}>
              {busy === 'starting' ? 'Starting the interview…' : 'Start interview'}
            </button>
            {error && (
              <p className="interview-error" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="interview-thread" aria-live="polite">
              {session.messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              {pending && <Message message={{ id: 'pending', role: 'candidate', content: pending, createdAt: '' }} />}
              {(busy === 'sending' || busy === 'finishing') && (
                <p className="interview-typing">
                  {busy === 'finishing' || (pending && session.answersGiven + 1 >= session.maxAnswers)
                    ? 'Writing your feedback…'
                    : 'Interviewer is typing…'}
                </p>
              )}

              {session.status === 'finished' &&
                (session.evaluation ? (
                  <EvaluationCard evaluation={session.evaluation} onNew={newInterview} />
                ) : (
                  <div className="interview-card">
                    <p className="interview-muted">
                      {answered ? "Your feedback isn't ready yet." : 'This interview ended before any answers.'}
                    </p>
                    <div className="interview-actions">
                      {answered && (
                        <button type="button" className="interview-secondary" onClick={finish} disabled={busy !== null}>
                          Get feedback
                        </button>
                      )}
                      <button type="button" className="interview-primary" onClick={newInterview} disabled={busy !== null}>
                        New interview
                      </button>
                    </div>
                  </div>
                ))}
              <div ref={threadEnd} />
            </div>

            {error && (
              <p className="interview-error interview-error-bar" role="alert">
                {error}
              </p>
            )}

            {active && (recording || transcribing) && (
              <p className={`interview-voice-status${recording ? ' is-recording' : ''}`} role="status">
                {recording ? (
                  <>
                    <i className="ti ti-point-filled" aria-hidden="true" />
                    Recording {formatTime(recorder.seconds)}. Speak your answer, then press Stop.
                  </>
                ) : (
                  'Turning your speech into text…'
                )}
              </p>
            )}

            {active && (
              <div className="interview-composer">
                <textarea
                  ref={composer}
                  className="interview-input"
                  aria-label="Your answer"
                  placeholder={canRecord ? 'Type your answer, or press Speak' : 'Type your answer'}
                  value={draft}
                  maxLength={MAX_ANSWER_LENGTH}
                  rows={1}
                  disabled={busy !== null || recording || transcribing}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className={`interview-voice${recording ? ' is-recording' : ''}`}
                  onClick={recording ? recorder.stop : recorder.start}
                  disabled={!canRecord || busy !== null || transcribing}
                  aria-pressed={recording}
                  title={
                    canRecord
                      ? 'Answer by voice: your speech is turned into text you can check before sending'
                      : 'Voice input needs microphone access, which browsers only allow on https or localhost'
                  }
                >
                  <i className={`ti ${recording ? 'ti-player-stop' : 'ti-microphone'}`} aria-hidden="true" />
                  {recording ? 'Stop' : 'Speak'}
                </button>
                <button
                  type="button"
                  className="interview-send"
                  onClick={send}
                  disabled={!draft.trim() || busy !== null || recording || transcribing}
                  aria-label="Send answer"
                >
                  <i className="ti ti-send" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function Message({ message }: { message: InterviewMessage }) {
  const mine = message.role === 'candidate'
  return (
    <div className={`interview-message${mine ? ' is-mine' : ''}`}>
      <span className="interview-author">{mine ? 'You' : 'Interviewer'}</span>
      <p className="interview-bubble">{message.content}</p>
    </div>
  )
}

function EvaluationCard({ evaluation, onNew }: { evaluation: InterviewEvaluation; onNew: () => void }) {
  const level =
    evaluation.score >= 85
      ? { label: 'Strong understanding', tone: 'is-strong', icon: 'ti-circle-check' }
      : evaluation.score >= 60
        ? { label: 'Good, with some gaps', tone: 'is-good', icon: 'ti-circle-half-2' }
        : evaluation.score >= 40
          ? { label: 'Partly there', tone: 'is-partial', icon: 'ti-circle-half-2' }
          : { label: 'Needs more work', tone: 'is-weak', icon: 'ti-circle-x' }

  return (
    <div className="interview-card">
      <p className={`interview-verdict ${level.tone}`}>
        <i className={`ti ${level.icon}`} aria-hidden="true" />
        {level.label}
        <span className="interview-score">{evaluation.score} / 100</span>
      </p>
      <p className="interview-text">{evaluation.summary}</p>

      {evaluation.strengths.length > 0 && (
        <section>
          <h3 className="interview-subtitle">What you explained well</h3>
          <ul className="interview-list">
            {evaluation.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {evaluation.improvements.length > 0 && (
        <section>
          <h3 className="interview-subtitle">What to work on</h3>
          <ul className="interview-list">
            {evaluation.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="interview-actions">
        <button type="button" className="interview-primary" onClick={onNew}>
          New interview
        </button>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function messageOf(error: unknown) {
  return error instanceof ApiError ? error.message : "Couldn't connect. Try again."
}

export default InterviewPage
