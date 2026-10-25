import { useEffect, useRef, useState } from 'react'
import { toBlob } from './canvas'
import './ShareButton.css'

interface ShareButtonProps {
  // Button text, e.g. "Share profile"
  label: string
  // File name without extension
  fileName: string
  // Shared text for the native share sheet
  shareText: string
  // Draws the card; called when the dialog opens
  render: () => Promise<HTMLCanvasElement>
  className?: string
}

type Preview = { status: 'idle' } | { status: 'drawing' } | { status: 'ready'; url: string; blob: Blob } | { status: 'error' }

const canCopyImage = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write

// A button that opens a preview of a share card with download, copy and (where supported) native share
export function ShareButton({ label, fileName, shareText, render, className }: ShareButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<Preview>({ status: 'idle' })
  const [notice, setNotice] = useState<string | null>(null)

  // Object URLs hold the image in memory until they're revoked
  useEffect(() => {
    return () => {
      if (preview.status === 'ready') URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  async function open() {
    setNotice(null)
    dialog.current?.showModal()
    setPreview({ status: 'drawing' })
    try {
      const blob = await toBlob(await render())
      setPreview({ status: 'ready', url: URL.createObjectURL(blob), blob })
    } catch {
      setPreview({ status: 'error' })
    }
  }

  function download() {
    if (preview.status !== 'ready') return
    const link = document.createElement('a')
    link.href = preview.url
    link.download = `${fileName}.png`
    link.click()
  }

  async function copy() {
    if (preview.status !== 'ready') return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': preview.blob })])
      setNotice('Image copied. Paste it into your post.')
    } catch {
      setNotice("Couldn't copy the image. Download it instead.")
    }
  }

  const file = preview.status === 'ready' ? new File([preview.blob], `${fileName}.png`, { type: 'image/png' }) : null
  const canShareFile = !!file && !!navigator.canShare?.({ files: [file] })

  async function share() {
    if (!file) return
    try {
      await navigator.share({ files: [file], text: shareText })
    } catch {
      // Closing the share sheet rejects too; nothing to report
    }
  }

  return (
    <>
      <button type="button" className={className ?? 'share-open'} onClick={open}>
        <i className="ti ti-share" aria-hidden="true" />
        {label}
      </button>

      <dialog
        ref={dialog}
        className="share-dialog"
        aria-labelledby={`${fileName}-share-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <div className="share-head">
          <h2 id={`${fileName}-share-title`} className="share-title">
            {label}
            <span className="share-preview-label">Preview:</span>
          </h2>
          <button type="button" className="share-close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className="share-preview">
          {preview.status === 'drawing' && <p className="share-muted">Drawing your card…</p>}
          {preview.status === 'error' && <p className="share-error">Couldn't create the image. Try again.</p>}
          {preview.status === 'ready' && <img src={preview.url} alt="Your share card" />}
        </div>

        <div className="share-actions">
          <button type="button" className="share-primary" disabled={preview.status !== 'ready'} onClick={download}>
            <i className="ti ti-download" aria-hidden="true" />
            Download PNG
          </button>
          {canCopyImage && (
            <button type="button" className="share-secondary" disabled={preview.status !== 'ready'} onClick={copy}>
              <i className="ti ti-copy" aria-hidden="true" />
              Copy image
            </button>
          )}
          {canShareFile && (
            <button type="button" className="share-secondary" onClick={share}>
              <i className="ti ti-share-2" aria-hidden="true" />
              Share…
            </button>
          )}
        </div>
        {/* Empty until something is copied or fails, so no line of text sits under the buttons */}
        <p className="share-muted" role="status">
          {notice}
        </p>
      </dialog>
    </>
  )
}
