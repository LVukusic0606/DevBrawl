import { useState } from 'react'
import type { CodeFile, CodeInvestigationChallenge, CodeInvestigationReveal, PathAnswer } from '../types'
import { CodeView, LockBar, StatusTag, type ChallengeProps } from './shared'

interface TreeRow {
  key: string
  depth: number
  name: string
  // Set for files, empty for folders
  file?: CodeFile
}

// Flattens the paths into folder and file rows, in path order
function buildRows(files: CodeFile[]): TreeRow[] {
  const rows: TreeRow[] = []
  const seenFolders = new Set<string>()
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sorted) {
    const parts = file.path.split('/')
    parts.slice(0, -1).forEach((part, depth) => {
      const folder = parts.slice(0, depth + 1).join('/')
      if (seenFolders.has(folder)) return
      seenFolders.add(folder)
      rows.push({ key: `dir:${folder}`, depth, name: part })
    })
    rows.push({ key: file.path, depth: parts.length - 1, name: parts[parts.length - 1], file })
  }
  return rows
}

export function CodeInvestigation({
  challenge,
  reveal,
  answer,
  locked,
  submitting,
  onSubmit,
}: ChallengeProps<CodeInvestigationChallenge, CodeInvestigationReveal, PathAnswer>) {
  const [selected, setSelected] = useState<string | null>(answer?.path ?? null)
  const [openPath, setOpenPath] = useState<string>(reveal?.answer.path ?? challenge.files[0]?.path ?? '')
  const picked = answer?.path ?? selected
  const rows = buildRows(challenge.files)
  const openFile = challenge.files.find((file) => file.path === openPath) ?? challenge.files[0]
  const answerPath = reveal?.answer.path ?? null

  return (
    <div className="duel-challenge">
      <div className="investigate">
        <nav className="investigate-tree" aria-label="Project files">
          <p className="investigate-tree-title">Files</p>
          <ul>
            {rows.map((row) =>
              row.file ? (
                <li key={row.key}>
                  <button
                    type="button"
                    className={[
                      'investigate-file',
                      row.file.path === openFile?.path ? 'is-open' : '',
                      reveal && row.file.path === answerPath ? 'is-correct' : '',
                      reveal && row.file.path === picked && row.file.path !== answerPath ? 'is-wrong' : '',
                      !reveal && row.file.path === picked ? 'is-picked' : '',
                    ].join(' ')}
                    style={{ paddingLeft: `${12 + row.depth * 16}px` }}
                    aria-current={row.file.path === openFile?.path ? 'true' : undefined}
                    onClick={() => setOpenPath(row.file!.path)}
                  >
                    <i className="ti ti-file-code" aria-hidden="true" />
                    <span className="investigate-file-name">{row.name}</span>
                    {!reveal && row.file.path === picked && <span className="investigate-flag">Suspect</span>}
                    {reveal && row.file.path === answerPath && (
                      <span className="investigate-flag">{row.file.path === picked ? 'Source · your pick' : 'Source'}</span>
                    )}
                    {reveal && row.file.path === picked && row.file.path !== answerPath && (
                      <span className="investigate-flag">Your pick</span>
                    )}
                  </button>
                </li>
              ) : (
                <li key={row.key} className="investigate-folder" style={{ paddingLeft: `${12 + row.depth * 16}px` }}>
                  <i className="ti ti-folder" aria-hidden="true" />
                  {row.name}
                </li>
              ),
            )}
          </ul>
        </nav>

        {openFile && (
          <section className="investigate-viewer" aria-label={openFile.path}>
            <header className="investigate-viewer-header">
              <span className="investigate-viewer-path">{openFile.path}</span>
              {!locked && (
                <button
                  type="button"
                  className={`duel-secondary${selected === openFile.path ? ' is-active' : ''}`}
                  aria-pressed={selected === openFile.path}
                  onClick={() => setSelected(openFile.path)}
                >
                  <i className="ti ti-target-arrow" aria-hidden="true" />
                  {selected === openFile.path ? 'Marked as the source' : 'The problem is in this file'}
                </button>
              )}
              {reveal && openFile.path === answerPath && (
                <StatusTag tone="correct">
                  {reveal.answer.lines[0] === reveal.answer.lines[1]
                    ? `Problem in line ${reveal.answer.lines[0]}`
                    : `Problem in lines ${reveal.answer.lines[0]}–${reveal.answer.lines[1]}`}
                </StatusTag>
              )}
            </header>
            <CodeView
              content={openFile.content}
              highlight={reveal && openFile.path === answerPath ? reveal.answer.lines : null}
            />
          </section>
        )}
      </div>

      {!locked && (
        <LockBar
          hint={selected ? `Suspect: ${selected}` : 'Open the files and mark the one where the problem starts.'}
          disabled={!selected}
          submitting={submitting}
          onLock={() => selected && onSubmit({ path: selected })}
        />
      )}
    </div>
  )
}
