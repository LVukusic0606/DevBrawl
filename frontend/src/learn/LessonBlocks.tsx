import { useState } from 'react'
import type { LessonBlock } from './content'
import './LessonBlocks.css'

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
          <pre className="lesson-code-body">
            <code>
              {block.code.split('\n').map((line, index) => (
                <span
                  key={index}
                  className="lesson-code-line"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {line || ' '}
                </span>
              ))}
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
          {block.visual === 'flexbox' ? <FlexboxDemo /> : <BranchesDemo />}
        </div>
      )
  }
}

type Direction = 'row' | 'column'
type Justify = 'start' | 'between'

const DIRECTION_CAPTIONS: Record<Direction, string> = {
  row: 'Children sit side by side.',
  column: 'Children stack from top to bottom.',
}

const JUSTIFY_CAPTIONS: Record<Justify, string> = {
  start: 'Children stay together at the start.',
  between: 'The free space is spread between the children.',
}

function FlexboxDemo() {
  const [direction, setDirection] = useState<Direction>('row')
  const [justify, setJustify] = useState<Justify>('start')
  const boxes = ['Logo', 'Links', 'Button']

  return (
    <>
      <div className="flex-demo-controls" role="group" aria-label="Flexbox settings">
        <button
          type="button"
          className="flex-demo-button"
          aria-pressed={direction === 'row'}
          onClick={() => setDirection('row')}
        >
          Row
        </button>
        <button
          type="button"
          className="flex-demo-button"
          aria-pressed={direction === 'column'}
          onClick={() => setDirection('column')}
        >
          Column
        </button>
        <button
          type="button"
          className="flex-demo-button"
          aria-pressed={justify === 'start'}
          onClick={() => setJustify('start')}
        >
          Start
        </button>
        <button
          type="button"
          className="flex-demo-button"
          aria-pressed={justify === 'between'}
          onClick={() => setJustify('between')}
        >
          Space between
        </button>
      </div>

      {/* The key replays the entrance animation whenever a setting changes. */}
      <div
        key={`${direction}-${justify}`}
        className={`flex-demo-stage is-${direction} justify-${justify}`}
      >
        {boxes.map((box, index) => (
          <span
            key={box}
            className="flex-demo-box"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {box}
          </span>
        ))}
      </div>

      <p className="lesson-visual-caption">
        {DIRECTION_CAPTIONS[direction]} {JUSTIFY_CAPTIONS[justify]}
      </p>
    </>
  )
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

      <div className="flex-demo-controls">
        <button type="button" className="flex-demo-button" onClick={() => setRun((value) => value + 1)}>
          Replay
        </button>
      </div>
    </>
  )
}
