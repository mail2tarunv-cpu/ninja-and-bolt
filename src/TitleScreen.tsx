import { useEffect, useRef } from 'react'
import GameIcon from './GameIcon'
import './title.css'

export default function TitleScreen({ onStart, soundEnabled, onToggleSound }: {
  onStart: () => void; soundEnabled: boolean; onToggleSound: () => void
}) {
  const panel = useRef<HTMLElement>(null)
  const start = useRef<HTMLButtonElement>(null)
  useEffect(() => { start.current?.focus() }, [])
  return <section className="title-screen" ref={panel} role="dialog" aria-modal="true" aria-labelledby="game-title"
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const buttons = panel.current?.querySelectorAll('button')
      if (!buttons) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}>
    <img className="title-background" src="/story/title-background.png" alt="Bolt and Ninja look toward the glowing windows of the toy factory." />
    <div className="title-brand">
      <h1 id="game-title">HALLOWAY <span>TOYS</span></h1>
      <p>A two-player factory escape</p>
    </div>
    <button className="title-sound" onClick={onToggleSound} aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'} aria-pressed={soundEnabled}>
      <GameIcon name={soundEnabled ? 'sound' : 'mute'} />
    </button>
    <div className="title-start">
      <button ref={start} onClick={onStart}><GameIcon name="play" /> Start adventure <span aria-hidden="true">→</span></button>
      <p>Two players. One keyboard. Escape together.</p>
    </div>
  </section>
}
