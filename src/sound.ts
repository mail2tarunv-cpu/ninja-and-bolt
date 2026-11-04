/**
 * Original, lightweight musical theme and toy-factory effects made with Web Audio.
 * No external audio files, CDN, or licensing requirements.
 */
export type GameSoundEvent = 'ui' | 'jump' | 'build' | 'gem' | 'key' | 'switch' | 'failure' | 'victory'

const SCALE = [196, 246.94, 293.66, 369.99, 392, 369.99, 293.66, 246.94]
const BASS = [98, 87.31, 82.41, 87.31]

export class GameSound {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private started = false
  private enabled = true
  private noteEnd = 0

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try { this.enabled = localStorage.getItem('ninjabot-sound') !== 'off' } catch { /* private mode */ }
    }
  }

  isEnabled() { return this.enabled }

  private init() {
    if (this.context) return this.context
    const AudioClass = typeof window === 'undefined' ? undefined :
      (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    if (!AudioClass) return null
    const ctx = new AudioClass()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.ratio.value = 3
    compressor.connect(ctx.destination)
    const music = ctx.createGain()
    const sfx = ctx.createGain()
    music.gain.value = this.enabled ? 0.11 : 0
    sfx.gain.value = this.enabled ? 0.28 : 0
    music.connect(compressor)
    sfx.connect(compressor)
    this.musicGain = music
    this.sfxGain = sfx
    this.context = ctx
    return ctx
  }

  private note(dest: GainNode, hz: number, at: number, length: number, amp = 0.2,
    type: OscillatorType = 'triangle', to?: number) {
    const ctx = this.context
    if (!ctx) return
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(hz, at)
    if (to && to > 0) osc.frequency.exponentialRampToValueAtTime(to, at + length)
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), at + Math.min(0.02, length / 4))
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(env)
    env.connect(dest)
    osc.start(at)
    osc.stop(at + length + 0.02)
    this.noteEnd = Math.max(this.noteEnd, at + length)
  }

  // Music-box melody, toy percussion, and a slow factory motor pulse.
  private tick = () => {
    const ctx = this.context, output = this.musicGain
    if (!ctx || !output || !this.started) return
    const now = ctx.currentTime + 0.01
    const n = this.step
    this.note(output, SCALE[n % SCALE.length], now, 0.34, 0.25, 'sine')
    this.note(output, SCALE[n % SCALE.length] * 2, now, 0.22, 0.08, 'triangle')
    if (n % 2 === 0) this.note(output, BASS[Math.floor(n / 2) % BASS.length], now, 0.64, 0.14, 'sine')
    if (n % 4 === 2) this.note(output, 310, now + 0.13, 0.07, 0.033, 'square', 260)
    this.step += 1
  }

  start() {
    const ctx = this.init()
    if (!ctx) return
    void ctx.resume()
    if (this.started) return
    this.started = true
    this.tick()
    this.timer = window.setInterval(this.tick, 420)
  }

  stop() {
    this.started = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    try { localStorage.setItem('ninjabot-sound', enabled ? 'on' : 'off') } catch { /* storage unavailable */ }
    const ctx = this.context
    if (ctx) {
      this.musicGain?.gain.setTargetAtTime(enabled ? 0.11 : 0, ctx.currentTime, 0.08)
      this.sfxGain?.gain.setTargetAtTime(enabled ? 0.28 : 0, ctx.currentTime, 0.05)
    }
  }

  play(event: GameSoundEvent) {
    if (!this.enabled) return
    const ctx = this.init(), out = this.sfxGain
    if (!ctx || !out) return
    void ctx.resume()
    const t = ctx.currentTime + 0.01
    switch (event) {
      case 'ui': this.note(out, 560, t, 0.085, 0.12, 'sine', 760); break
      case 'jump': this.note(out, 310, t, 0.13, 0.17, 'triangle', 550); break
      case 'build':
        this.note(out, 190, t, 0.14, 0.25, 'square', 130)
        this.note(out, 390, t + 0.05, 0.11, 0.15, 'triangle', 290)
        break
      case 'gem':
        this.note(out, 840, t, 0.14, 0.28, 'sine', 1200)
        this.note(out, 1260, t + 0.07, 0.18, 0.21, 'sine')
        break
      case 'key':
        this.note(out, 525, t, 0.16, 0.22)
        this.note(out, 785, t + 0.10, 0.19, 0.18)
        this.note(out, 1048, t + 0.20, 0.22, 0.15)
        break
      case 'switch':
        this.note(out, 210, t, 0.13, 0.27, 'square', 145)
        this.note(out, 480, t + 0.11, 0.15, 0.12)
        break
      case 'failure':
        this.note(out, 250, t, 0.5, 0.24, 'sawtooth', 96)
        this.note(out, 175, t + 0.2, 0.43, 0.14, 'sine', 87)
        break
      case 'victory':
        ;[392, 494, 587.33, 784].forEach((freq, i) => this.note(out, freq, t + i * 0.13, 0.3, 0.16, 'sine'))
        break
    }
  }

  destroy() {
    this.stop()
    void this.context?.close()
    this.context = null
  }
}
