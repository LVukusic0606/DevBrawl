import { useState } from 'react'
import type { InjectionExplorerBlock, LessonBlock, MethodExplorerBlock, Trait, WalkthroughBlock } from './content'
import { highlightLines } from '../duel/challenges/highlight'
import './LessonBlocks.css'

interface HighlightedLinesProps {
  code: string
  language?: string
}

// One span per line, colored with the same token classes as the duel code
function HighlightedLines({ code, language }: HighlightedLinesProps) {
  const lines = highlightLines(code, language)

  return (
    <>
      {lines.map((html, index) => (
        <span
          key={index}
          className="lesson-code-line"
          style={{ animationDelay: `${index * 60}ms` }}
          // highlight.js escapes the text itself, so the HTML is safe to inject
          dangerouslySetInnerHTML={{ __html: html || ' ' }}
        />
      ))}
    </>
  )
}

const TRAIT_LABEL: Record<Trait, string> = {
  yes: 'Yes',
  no: 'No',
  depends: 'Depends on the change',
}

interface LessonBlockViewProps {
  block: LessonBlock
}

export function LessonBlockView({ block }: LessonBlockViewProps) {
  switch (block.type) {
    case 'text':
      return <p className="learn-lesson-text">{block.text}</p>

    case 'code':
      return (
        <figure className="lesson-code">
          <figcaption className="lesson-code-file">{block.file}</figcaption>
          <pre className="lesson-code-body lesson-syntax">
            <code>
              <HighlightedLines code={block.code} language={block.language} />
            </code>
          </pre>
        </figure>
      )

    case 'steps':
      return (
        <ol className="lesson-steps">
          {block.steps.map((step, index) => (
            <li
              key={index}
              className="lesson-step"
              style={{ animationDelay: `${index * 180}ms` }}
            >
              <span className="lesson-step-index">{index + 1}</span>
              <span className="lesson-step-text">{step}</span>
            </li>
          ))}
        </ol>
      )

    case 'table':
      return (
        <div className="lesson-table-wrap">
          <table className="lesson-table">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ animationDelay: `${rowIndex * 120}ms` }}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'timeline':
      return (
        <ol className="lesson-timeline">
          {block.items.map((item, index) => (
            <li
              key={index}
              className="lesson-timeline-item"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <p className="lesson-timeline-title">{item.title}</p>
              <p className="lesson-timeline-detail">{item.detail}</p>
            </li>
          ))}
        </ol>
      )

    case 'visual':
      return (
        <div className="lesson-visual">
          <BranchesDemo />
        </div>
      )

    case 'method-explorer':
      return <MethodExplorer methods={block.methods} />

    case 'retry-demo':
      return <RetryDemo />

    case 'section':
      return <h2 className="lesson-section-title">{block.title}</h2>

    case 'walkthrough':
      return <Walkthrough block={block} />

    case 'injection-explorer':
      return <InjectionExplorer block={block} />

    case 'mistakes':
      return (
        <section className="lesson-mistakes" aria-label="Common mistakes">
          <p className="lesson-callout-title">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Common mistakes
          </p>
          <ul className="lesson-mistakes-list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )

    case 'takeaway':
      return (
        <section className="lesson-takeaway" aria-label="Key takeaway">
          <p className="lesson-callout-title">
            <i className="ti ti-bulb" aria-hidden="true" />
            Key takeaway
          </p>
          <p className="lesson-takeaway-text">{block.text}</p>
        </section>
      )
  }
}

function BranchesDemo() {
  const [run, setRun] = useState(0)

  return (
    <>
      <svg
        key={run}
        className="branches-svg"
        viewBox="0 0 480 220"
        role="img"
        aria-label="A feature branch splits from main, gets three commits and merges back into main"
      >
        <path className="branches-main" d="M40 170 H440" pathLength={1} />
        <path
          className="branches-feature"
          d="M140 170 C 170 70, 190 70, 220 70 H 320 C 350 70, 360 170, 380 170"
          pathLength={1}
          style={{ animationDelay: '400ms' }}
        />

        <circle className="branches-dot is-main" cx="60" cy="170" r="6" />
        <circle className="branches-dot is-main" cx="140" cy="170" r="6" />
        <circle className="branches-dot is-main" cx="380" cy="170" r="6" style={{ animationDelay: '1600ms' }} />
        <circle className="branches-dot is-main" cx="440" cy="170" r="6" style={{ animationDelay: '1800ms' }} />

        <circle className="branches-dot is-feature" cx="220" cy="70" r="6" style={{ animationDelay: '900ms' }} />
        <circle className="branches-dot is-feature" cx="270" cy="70" r="6" style={{ animationDelay: '1100ms' }} />
        <circle className="branches-dot is-feature" cx="320" cy="70" r="6" style={{ animationDelay: '1300ms' }} />

        <text className="branches-label" x="40" y="200">main</text>
        <text className="branches-label is-feature" x="200" y="46">feature/login</text>
        <text className="branches-label" x="352" y="200">merge</text>
      </svg>

      <div className="lesson-visual-controls">
        <button type="button" className="lesson-visual-button" onClick={() => setRun((value) => value + 1)}>
          Replay
        </button>
      </div>
    </>
  )
}

function MethodExplorer({ methods }: { methods: MethodExplorerBlock['methods'] }) {
  const [selected, setSelected] = useState(0)
  const item = methods[selected]

  return (
    <div className="lesson-visual">
      <div className="lesson-visual-controls">
        {methods.map((entry, index) => (
          <button
            key={entry.method}
            type="button"
            className={`lesson-visual-button${index === selected ? ' is-active' : ''}`}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {entry.method}
          </button>
        ))}
      </div>

      <div key={item.method} className="lesson-explorer-panel">
        <p className="lesson-explorer-intent">{item.intent}</p>
        <dl className="lesson-explorer-facts">
          <div>
            <dt>Changes data?</dt>
            <dd>{item.changesData ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Safe to repeat?</dt>
            <dd>{TRAIT_LABEL[item.repeatSafe]}</dd>
          </div>
        </dl>
        <pre className="lesson-explorer-wire lesson-syntax">
          <code
            dangerouslySetInnerHTML={{
              __html: highlightLines(`${item.request}\n\n${item.response}`, 'http').join('\n'),
            }}
          />
        </pre>
        <p className="lesson-explorer-note">{item.note}</p>
      </div>
    </div>
  )
}

interface ServerLesson {
  id: number
  title: string
}

const SEED_LESSONS: ServerLesson[] = [
  { id: 11, title: 'Status codes' },
  { id: 12, title: 'HTTP methods' },
]

// A response gets lost, so the client sends the same request again. The server state shows what each repeat does.
function RetryDemo() {
  const [lessons, setLessons] = useState(SEED_LESSONS)
  const [nextId, setNextId] = useState(13)
  const [log, setLog] = useState<string[]>([])

  function send(method: 'POST' | 'PUT' | 'DELETE') {
    const exists = lessons.some((lesson) => lesson.id === 12)
    let line: string

    if (method === 'POST') {
      setLessons([...lessons, { id: nextId, title: 'New lesson' }])
      setNextId(nextId + 1)
      line = `POST /lessons → 201 Created, id ${nextId}`
    } else if (method === 'PUT') {
      if (exists) {
        line = 'PUT /lessons/12 → 200 OK, same copy, nothing changed'
      } else {
        setLessons([...lessons, { id: 12, title: 'HTTP methods' }])
        line = 'PUT /lessons/12 → 201 Created, lesson 12 restored'
      }
    } else if (exists) {
      setLessons(lessons.filter((lesson) => lesson.id !== 12))
      line = 'DELETE /lessons/12 → 204 No Content'
    } else {
      line = 'DELETE /lessons/12 → 404 Not Found, already gone'
    }

    setLog([line, ...log].slice(0, 5))
  }

  function reset() {
    setLessons(SEED_LESSONS)
    setNextId(13)
    setLog([])
  }

  const sorted = [...lessons].sort((a, b) => a.id - b.id)

  return (
    <div className="lesson-visual">
      <p className="lesson-visual-caption">Press a button several times and watch what the server stores.</p>

      <div className="lesson-visual-controls">
        <button type="button" className="lesson-visual-button" onClick={() => send('POST')}>
          Send POST /lessons
        </button>
        <button type="button" className="lesson-visual-button" onClick={() => send('PUT')}>
          Send PUT /lessons/12
        </button>
        <button type="button" className="lesson-visual-button" onClick={() => send('DELETE')}>
          Send DELETE /lessons/12
        </button>
        <button type="button" className="lesson-visual-button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="lesson-retry-grid">
        <section className="lesson-retry-panel" aria-label="Lessons on the server">
          <p className="lesson-retry-label">Lessons on the server</p>
          {sorted.length > 0 ? (
            <ul className="lesson-retry-list">
              {sorted.map((lesson) => (
                <li key={lesson.id}>
                  <span>{lesson.id}</span> {lesson.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="lesson-retry-empty">No lessons left.</p>
          )}
        </section>

        <section className="lesson-retry-panel" aria-label="Responses" aria-live="polite">
          <p className="lesson-retry-label">Responses</p>
          {log.length > 0 ? (
            <ul className="lesson-retry-list">
              {log.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="lesson-retry-empty">Press a button to start.</p>
          )}
        </section>
      </div>
    </div>
  )
}

// The same input twice: glued into the SQL string, and sent next to the query as a parameter
function InjectionExplorer({ block }: { block: InjectionExplorerBlock }) {
  const [selected, setSelected] = useState(0)
  const payload = block.payloads[selected]

  // Highlighting the glued query shows the input turning into SQL keywords, exactly as the database parses it
  const glued = highlightLines(block.unsafe.replace('{input}', payload.input), 'sql').join('\n')
  // The value is shown as a comment: it travels apart from the query and is never parsed as SQL
  const parameterized = highlightLines(
    `${block.safe}\n-- sent separately: ${block.param} = ${JSON.stringify(payload.input)}`,
    'sql',
  ).join('\n')

  return (
    <div className="lesson-visual">
      <p className="lesson-visual-caption">{block.caption}</p>

      <div className="lesson-visual-controls">
        {block.payloads.map((entry, index) => (
          <button
            key={entry.label}
            type="button"
            className={`lesson-visual-button${index === selected ? ' is-active' : ''}`}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div key={selected} className="lesson-explorer-panel">
        <p className="lesson-inject-field">
          <span className="lesson-inject-field-label">{block.field}</span>
          <code className="lesson-inject-input">{payload.input}</code>
        </p>

        <div className="lesson-inject-grid">
          <InjectionPanel
            title="Glued into the string"
            status={payload.breach ? 'Broken' : 'Works'}
            tone={payload.breach ? 'danger' : 'neutral'}
            query={glued}
            rows={payload.unsafeResult}
          />
          <InjectionPanel title="Sent as a parameter" status="Safe" tone="safe" query={parameterized} rows={payload.safeResult} />
        </div>

        <p className="lesson-explorer-note">{payload.note}</p>
      </div>
    </div>
  )
}

interface InjectionPanelProps {
  title: string
  // Shown as text next to the color, so the state never depends on color alone
  status: string
  tone: 'danger' | 'safe' | 'neutral'
  // Highlighted SQL from highlight.js, which escapes the text itself
  query: string
  rows: string[]
}

function InjectionPanel({ title, status, tone, query, rows }: InjectionPanelProps) {
  return (
    <section className={`lesson-inject-panel is-${tone}`} aria-label={title}>
      <header className="lesson-inject-header">
        <p className="lesson-inject-title">{title}</p>
        <span className="lesson-inject-status">{status}</span>
      </header>
      <pre className="lesson-explorer-wire lesson-inject-query lesson-syntax">
        <code dangerouslySetInnerHTML={{ __html: query }} />
      </pre>
      <p className="lesson-retry-label">The database returns</p>
      <ul className="lesson-retry-list">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </section>
  )
}

// Pressing Next writes the next call into one file that keeps growing. The newest call animates in below the others.
function Walkthrough({ block }: { block: WalkthroughBlock }) {
  const { steps, file = 'api-client.ts', language = 'typescript', stepName = 'call' } = block
  const [shown, setShown] = useState(0)
  const finished = shown === steps.length
  const current = shown > 0 ? steps[shown - 1] : null

  // Flatten the written calls into lines, remembering each line's call and its position inside that call
  const lines = steps.slice(0, shown).flatMap((step, stepIndex) => {
    const codeLines = step.code.split('\n').map((text, lineIndex) => ({ text, stepIndex, lineIndex }))
    return [{ text: `// ${stepName} ${stepIndex + 1}`, stepIndex, lineIndex: -1 }, ...codeLines, { text: '', stepIndex, lineIndex: codeLines.length }]
  })

  // The file grows call by call, so it is highlighted as one piece to keep multi-line tokens right
  const highlighted = highlightLines(lines.map((line) => line.text).join('\n'), language)

  return (
    <div className="lesson-visual lesson-walk">
      <div className="lesson-walk-bar">
        <p className="lesson-walk-progress">
          {shown} of {steps.length} {stepName}s written
        </p>
        {finished && <p className="lesson-walk-hint">All {stepName}s are written. Reset to run them again.</p>}
      </div>

      <figure className="lesson-code">
        <figcaption className="lesson-code-file">{file}</figcaption>
        <pre className="lesson-code-body lesson-syntax">
          <code>
            {lines.length > 0 ? (
              lines.map((line, index) => (
                <span
                  key={index}
                  className="lesson-code-line"
                  style={{ animationDelay: `${Math.max(line.lineIndex, 0) * 80}ms` }}
                  dangerouslySetInnerHTML={{ __html: highlighted[index] || ' ' }}
                />
              ))
            ) : (
              <span className="lesson-walk-placeholder">// press Next to write the first {stepName}</span>
            )}
          </code>
        </pre>
      </figure>

      {current && (
        <>
          <p className="lesson-walk-result">
            <i className="ti ti-corner-down-right" aria-hidden="true" />
            {current.result}
          </p>
          <p className="lesson-walk-note">{current.note}</p>
        </>
      )}

      <div className="lesson-walk-actions">
        <button
          type="button"
          className="lesson-walk-next"
          disabled={finished}
          onClick={() => setShown(shown + 1)}
        >
          Next
        </button>
        <button type="button" className="lesson-visual-button" onClick={() => setShown(0)}>
          Reset
        </button>
      </div>
    </div>
  )
}
