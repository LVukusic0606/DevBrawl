import { useEffect, useRef, useState } from 'react'

export type RecorderStatus = 'idle' | 'recording' | 'processing'

interface WavRecorderOptions {
  maxSeconds: number
  // Called with the finished recording; the hook stays in 'processing' until it resolves
  onRecorded: (wav: Blob) => Promise<void>
  onError: (message: string) => void
}

// 16 kHz mono is what speech recognition works with, and keeps a 2-minute answer around 4 MB
const SAMPLE_RATE = 16000

export const canRecord =
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

// Records from the microphone and hands over a WAV file. Browsers record WebM or Ogg, which not every
// speech service accepts, so the recording is decoded and re-encoded as WAV in the browser.
export function useWavRecorder({ maxSeconds, onRecorded, onError }: WavRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | null>(null)
  const discard = useRef(false)
  const callbacks = useRef({ onRecorded, onError })

  useEffect(() => {
    callbacks.current = { onRecorded, onError }
  })

  // Leaving the page mid-recording releases the microphone and drops the recording
  useEffect(
    () => () => {
      discard.current = true
      if (timer.current !== null) window.clearInterval(timer.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
    },
    [],
  )

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  async function start() {
    if (status !== 'idle') return

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      callbacks.current.onError('Allow microphone access in your browser to answer by voice.')
      return
    }

    const chunks: Blob[] = []
    const media = new MediaRecorder(stream)
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    media.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())
      if (timer.current !== null) window.clearInterval(timer.current)
      timer.current = null
      recorder.current = null
      if (discard.current) return

      setStatus('processing')
      try {
        const wav = await toWav(new Blob(chunks, { type: media.mimeType }))
        await callbacks.current.onRecorded(wav)
      } catch {
        callbacks.current.onError("Couldn't process the recording. Try again.")
      } finally {
        setStatus('idle')
      }
    }

    recorder.current = media
    media.start()
    setSeconds(0)
    setStatus('recording')

    const startedAt = Date.now()
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(elapsed)
      if (elapsed >= maxSeconds) stop()
    }, 250)
  }

  return { status, seconds, start, stop }
}

async function toWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer())
    // A one-channel offline context mixes stereo down to mono while resampling
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE)), SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), SAMPLE_RATE)
  } finally {
    await context.close()
  }
}

// 16-bit PCM WAV: a 44-byte header followed by the samples
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}
