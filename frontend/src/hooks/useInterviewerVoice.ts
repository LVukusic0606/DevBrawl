import { useEffect, useRef, useState } from 'react'

export interface VoiceState {
  // The message being voiced
  id: string
  phase: 'loading' | 'playing'
}

// Plays the interviewer's spoken messages. One message plays at a time.
export function useInterviewerVoice() {
  const context = useRef<AudioContext | null>(null)
  const playing = useRef<AudioBufferSourceNode | null>(null)
  // Every play or stop bumps this, so a slow download for an older message never starts playing
  const request = useRef(0)
  const [state, setState] = useState<VoiceState | null>(null)

  useEffect(
    () => () => {
      stopSource(playing.current)
      void context.current?.close()
    },
    [],
  )

  // Browsers only allow sound after a user action: call this from click handlers before any await
  function unlock() {
    context.current ??= new AudioContext()
    void context.current.resume()
  }

  function stop() {
    request.current++
    stopSource(playing.current)
    playing.current = null
    setState(null)
  }

  async function play(id: string, load: () => Promise<Blob>) {
    stop()
    const mine = request.current
    unlock()
    setState({ id, phase: 'loading' })
    try {
      const audio = await load()
      const ctx = context.current!
      const buffer = await ctx.decodeAudioData(await audio.arrayBuffer())
      if (mine !== request.current) return

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => {
        if (mine !== request.current) return
        playing.current = null
        setState(null)
      }
      source.start()
      playing.current = source
      setState({ id, phase: 'playing' })
    } catch (error) {
      if (mine === request.current) setState(null)
      throw error
    }
  }

  return { state, play, stop, unlock }
}

function stopSource(source: AudioBufferSourceNode | null) {
  try {
    source?.stop()
  } catch {
    // Already stopped
  }
}
