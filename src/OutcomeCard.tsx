import { useEffect, useRef, type ReactNode } from 'react'
import GameIcon from './GameIcon'
import './outcome.css'

export default function OutcomeCard({ success = false, failureRole, description, children, onRetry, onHome }: {
  success?: boolean; failureRole?: 'robot' | 'ninja'; description: string; children: ReactNode; onRetry: () => void; onHome: () => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    button.current?.focus()
    return () => previous?.focus()
  }, [])
  return <div className="outcome-overlay" role="dialog" aria-modal="true" aria-labelledby="outcome-title" aria-describedby="outcome-description"
    onKeyDown={event => { if (event.key === 'Tab') {
      const actions = Array.from(event.currentTarget.querySelectorAll('button'))
      const index = actions.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      actions[(index + (event.shiftKey ? -1 : 1) + actions.length) % actions.length]?.focus()
    } }}>
    <section className={`outcome-card ${success ? 'outcome-success' : 'outcome-failure'}`}>
      {failureRole ? <div className={`outcome-character-art is-${failureRole}`} role="img" aria-label={`${failureRole === 'robot' ? 'Bolt' : 'Ninja'} sinking into a toy pit`} /> : <img className="outcome-art" src={`/story/${success ? 'success' : 'failure'}-background.png`} alt="" />}
      <header className="outcome-heading">
        <svg className="outcome-symbol" aria-hidden="true" viewBox="0 0 64 64" fill={success ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          {success ? <path d="m32 5 8 18 20 2-15 14 5 20-18-10-18 10 5-20L4 25l20-2Z" /> : <><path d="M28 8a5 5 0 0 1 8 0l24 43a5 5 0 0 1-4 7H8a5 5 0 0 1-4-7Z" /><path d="M32 23v15m0 9v1" /></>}
        </svg>
        <h2 id="outcome-title">{success ? 'MISSION COMPLETE' : 'MISSION FAILED'}</h2>
        <p id="outcome-description">{description}</p>
      </header>
      <footer className="outcome-footer">
        {children}
        <div className="outcome-actions"><button className="outcome-home" onClick={onHome}>Back to Home</button>
        <button className="outcome-retry" ref={button} onClick={onRetry}>{success ? 'Play again' : 'Try again'} <GameIcon name="restart" /></button></div>
      </footer>
    </section>
  </div>
}
