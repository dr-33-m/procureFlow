let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

export function beep(frequency = 1320, durationMs = 70, volume = 0.18): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = frequency
  gain.gain.value = volume
  osc.connect(gain).connect(ctx.destination)
  const now = ctx.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  osc.start(now)
  osc.stop(now + durationMs / 1000)
}
