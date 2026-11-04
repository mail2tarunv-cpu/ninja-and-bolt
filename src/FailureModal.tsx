import { useEffect, useRef } from 'react'

type FailureModalProps = {
  role: 'robot' | 'ninja'
  hazard: 'quicksand' | 'factory waste'
  onRetry: () => void
  onReturn: () => void
}

export default function FailureModal({ role, hazard, onRetry, onReturn }: FailureModalProps) {
  const retryRef = useRef<HTMLButtonElement>(null)
  const character = role === 'robot' ? 'Unit 7' : 'The Ninja'
  const hazardName = hazard === 'quicksand' ? 'the sinking toy pit' : 'the factory waste'

  useEffect(() => { retryRef.current?.focus() }, [])

  return (
    <div className="failure-overlay" role="dialog" aria-modal="true" aria-labelledby="failure-title" aria-describedby="failure-description">
      <section className="failure-panel">
        <header className="failure-heading">
          <div className="failure-status"><span aria-hidden="true" className="failure-status-light" /> HALLOWAY TOY WORKS <span> / </span> RESCUE INTERRUPTED</div>
          <h2 id="failure-title">MISSION FAILED<span className="failure-period">.</span></h2>
          <p id="failure-description">{character} was lost in {hazardName}. The factory isn't finished yet.</p>
        </header>
        <div className="failure-image">
          <img src="/story/teamwork.jpg" alt="Ninja and Unit 7 trying to cross a dangerous furnace pit using crates." />
          <span className="failure-image-label">ROUTE 07  /  CONNECTION LOST</span>
          <div className="failure-portrait" aria-hidden="true"><img src={`/sprites/${role}-portrait.png`} alt="" /></div>
        </div>
        <footer className="failure-bottom">
          <div className="failure-tip"><span>FIELD NOTE</span><p>Build the path first. Watch the dangerous gaps, then move together.</p></div>
          <div className="failure-actions">
            <button className="return-home" onClick={onReturn}>REPLAY STORY</button>
            <button className="retry-mission" ref={retryRef} onClick={onRetry}>TRY AGAIN <span aria-hidden="true">↻</span></button>
          </div>
        </footer>
      </section>
    </div>
  )
}
