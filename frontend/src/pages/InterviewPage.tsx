import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError } from '../api/client'
import {
  finishInterview,
  getInterview,
  getInterviewerSpeech,
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
import bugInterviewer from '../assets/bug-interviewer.webp'
import { useInterviewerVoice, type VoiceState } from '../hooks/useInterviewerVoice'
import { canRecord, useWavRecorder } from '../hooks/useWavRecorder'
import './InterviewPage.css'

interface InterviewPageProps {
  onBack: () => void
}

const MAX_ANSWER_LENGTH = 2000
const MAX_RECORDING_SECONDS = 120

// Select value: a category id, or "" for a random category. The interviewer picks the lessons within it.
type TopicChoice = string

const VOICE_SETTING = 'devbrawl.interview.voice'

function loadVoiceSetting() {
  try {
    return localStorage.getItem(VOICE_SETTING) !== 'off'
  } catch {
    return true
  }
}

// When the voice runs out (the server answers 429), it stays off until this time, even after a reload
const VOICE_PAUSE = 'devbrawl.interview.voicePausedUntil'
// Used when the server doesn't say how long to wait
const DEFAULT_VOICE_PAUSE_SECONDS = 60 * 60

function loadVoicePause(): number | null {
  try {
    const until = Number(localStorage.getItem(VOICE_PAUSE))
    return until > Date.now() ? until : null
  } catch {
    return null
  }
}

function saveVoicePause(until: number | null) {
  try {
    if (until === null) localStorage.removeItem(VOICE_PAUSE)
    else localStorage.setItem(VOICE_PAUSE, String(until))
  } catch {
    // The pause just won't survive a reload
  }
}

function InterviewPage({ onBack }: InterviewPageProps) {
  const [topics, setTopics] = useState<InterviewCategory[]>([])
  const [topic, setTopic] = useState<TopicChoice>('')
  const [history, setHistory] = useState<InterviewSummary[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<'starting' | 'sending' | 'finishing' | 'opening' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceOn, setVoiceOn] = useState(loadVoiceSetting)
  const [voicePausedUntil, setVoicePausedUntil] = useState(loadVoicePause)
  const feedback = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const voice = useInterviewerVoice()

  useEffect(() => {
    getInterviewTopics().then(setTopics).catch((e) => setError(messageOf(e)))
    listInterviews().then(setHistory).catch(() => {})
  }, [])

  // Bring the feedback into view once the interview ends
  useEffect(() => {
    if (session?.status === 'finished') feedback.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [session?.status, session?.evaluation])

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

  function speak(sessionId: string, message: InterviewMessage) {
    voice.play(message.id, () => getInterviewerSpeech(sessionId, message.id)).catch((e) => {
      if (e instanceof ApiError && e.status === 429) {
        // The voice is used up (e.g. the AI's daily quota), so stop asking until it resets instead of failing on every message
        const until = Date.now() + (e.retryAfter ?? DEFAULT_VOICE_PAUSE_SECONDS) * 1000
        setPause(until)
        setError(`The interviewer's voice is used up for now, so it's off until ${formatClock(until)}. You can still read the messages.`)
        return
      }
      setError("The interviewer's voice isn't available right now. You can still read the messages.")
    })
  }

  function setPause(until: number | null) {
    setVoicePausedUntil(until)
    saveVoicePause(until)
  }

  // Reads the interviewer's newest message aloud when the voice is on and not paused
  function speakLatest(updated: InterviewSession) {
    const latest = updated.messages.at(-1)
    if (!voiceOn || latest?.role !== 'interviewer') return
    if (voicePausedUntil !== null) {
      if (voicePausedUntil > Date.now()) return
      setPause(null)
    }
    speak(updated.id, latest)
  }

  // Turning the voice on also lifts a pause, so the user can try again before it ends
  function toggleVoice() {
    const next = !voiceShownOn
    setVoiceOn(next)
    setPause(null)
    if (!next) voice.stop()
    try {
      localStorage.setItem(VOICE_SETTING, next ? 'on' : 'off')
    } catch {
      // The setting just won't be remembered
    }
  }

  async function start() {
    // Sound is only allowed after a click, so prepare it before the request
    voice.unlock()
    setBusy('starting')
    setError(null)
    try {
      const started = await startInterview(topic ? { categoryId: topic } : {})
      setSession(started)
      setDraft('')
      refreshHistory()
      speakLatest(started)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  async function open(id: string) {
    if (busy) return
    voice.stop()
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
    voice.stop()
    voice.unlock()
    setDraft('')
    setBusy('sending')
    setError(null)
    try {
      const updated = await sendInterviewMessage(session.id, answer)
      setSession(updated)
      if (updated.status === 'finished') refreshHistory()
      speakLatest(updated)
    } catch (e) {
      // Nothing was saved, so give the answer back to send again
      setDraft(answer)
      setError(messageOf(e))
    } finally {
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
    voice.stop()
    setSession(null)
    setDraft('')
    setError(null)
  }

  function leave() {
    voice.stop()
    onBack()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter starts a new line
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const active = session?.status === 'active'
  const voiceShownOn = voiceOn && voicePausedUntil === null
  const recording = recorder.status === 'recording'
  const transcribing = recorder.status === 'processing'
  const answered = session?.messages.some((m) => m.role === 'candidate') ?? false
  const lastAnswer = busy === 'sending' && session !== null && session.answersGiven + 1 >= session.maxAnswers
  const latestQuestion = session?.messages.findLast((m) => m.role === 'interviewer') ?? null

  // What the bug's speech bubble says: a waiting line while the server works, otherwise the interviewer's newest message
  const stageLine: StageLine =
    busy === 'starting'
      ? { waiting: 'Getting my questions ready' }
      : busy === 'finishing' || lastAnswer
        ? { waiting: 'Writing your feedback' }
        : busy === 'sending'
          ? { waiting: 'Thinking about your answer' }
          : session && latestQuestion
            ? { message: latestQuestion }
            : {
                text: "Hi, I'm Dev_Bug. Pick a topic and I'll ask you a few questions about it. Answer in your own words, by typing or speaking, and I'll give you feedback at the end.",
              }

  return (
    <main className={`interview${session ? ' has-session' : ''}`}>
      <aside className="interview-sidebar" aria-label="Interview history">
        <button type="button" className="interview-back" onClick={leave}>
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
          <button type="button" className="interview-back interview-back-mobile" onClick={session ? newInterview : leave}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back
          </button>
          <div className="interview-heading">
            <span className="interview-logo">{session ? session.title : 'Current interview'}</span>
            {session && (
              <span className="interview-progress">
                {active ? `Answer ${Math.min(session.answersGiven + 1, session.maxAnswers)} of ${session.maxAnswers}` : 'Finished'}
              </span>
            )}
          </div>
          <button
            type="button"
            className={`interview-secondary interview-voice-toggle${voiceShownOn ? ' is-on' : ''}`}
            onClick={toggleVoice}
            aria-pressed={voiceShownOn}
            title={
              voicePausedUntil !== null
                ? `The voice is used up until ${formatClock(voicePausedUntil)}. Press to try again now.`
                : voiceOn
                  ? 'The interviewer reads its messages aloud'
                  : 'The interviewer is muted'
            }
          >
            <i className={`ti ${voiceShownOn ? 'ti-volume' : 'ti-volume-off'}`} aria-hidden="true" />
            {voiceShownOn ? 'Voice on' : 'Voice off'}
          </button>
          {active && (
            <button type="button" className="interview-secondary" onClick={finish} disabled={busy !== null || recording}>
              {busy === 'finishing' ? 'Ending…' : 'End interview'}
            </button>
          )}
        </header>

        <div className="interview-stage-scroll">
          <div className="interview-stage">
            <InterviewerSpeech
              line={stageLine}
              voice={voice.state}
              onPlay={(message) => {
                if (!session) return
                voice.unlock()
                speak(session.id, message)
              }}
              onStop={voice.stop}
            />

            {!session && (
              <div className="interview-start">
                <label className="interview-label" htmlFor="interview-topic">
                  Category
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
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
                <button type="button" className="interview-primary" onClick={start} disabled={busy !== null}>
                  {busy === 'starting' ? 'Starting the interview…' : 'Start interview'}
                </button>
              </div>
            )}

            {session?.status === 'finished' && (
              <div ref={feedback} className="interview-feedback">
                {session.evaluation ? (
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
                )}
              </div>
            )}
          </div>
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
              onClick={
                recording
                  ? recorder.stop
                  : () => {
                      // The microphone shouldn't pick up the interviewer
                      voice.stop()
                      recorder.start()
                    }
              }
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
      </section>
    </main>
  )
}

type StageLine = { message: InterviewMessage } | { text: string } | { waiting: string }

interface InterviewerSpeechProps {
  line: StageLine
  voice: VoiceState | null
  onPlay: (message: InterviewMessage) => void
  onStop: () => void
}

// Dev_Bug in his interview suit with one speech bubble: his current line is the whole conversation on screen
function InterviewerSpeech({ line, voice, onPlay, onStop }: InterviewerSpeechProps) {
  const message = 'message' in line ? line.message : null
  const phase = message && voice?.id === message.id ? voice.phase : null
  const text = 'message' in line ? line.message.content : 'text' in line ? line.text : `${line.waiting}…`

  return (
    <div className={`interview-speaker${phase === 'playing' ? ' is-speaking' : ''}`} aria-live="polite">
      <div key={message?.id ?? text} className="interview-speech">
        <span className="interview-author">
          Dev_Bug
          {message && (
            <button
              type="button"
              className="interview-listen"
              onClick={phase ? onStop : () => onPlay(message)}
              aria-label={phase ? 'Stop reading aloud' : 'Read this message aloud'}
            >
              <i className={`ti ${phase ? 'ti-player-stop' : 'ti-volume'}`} aria-hidden="true" />
              {phase === 'loading' ? 'Loading voice…' : phase === 'playing' ? 'Speaking…' : null}
            </button>
          )}
        </span>
        <p className={`interview-speech-text${'waiting' in line ? ' is-waiting' : ''}`}>{text}</p>
      </div>
      <img className="interview-bug" src={bugInterviewer} alt="" />
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

function formatClock(time: number) {
  return new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function messageOf(error: unknown) {
  return error instanceof ApiError ? error.message : "Couldn't connect. Try again."
}

export default InterviewPage
