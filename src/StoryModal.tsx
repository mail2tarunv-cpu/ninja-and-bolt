import { useEffect, useRef, useState } from 'react'

type StoryMode = 'onboarding' | 'popup'
type StoryModalProps = {
  mode?: StoryMode
  onBegin: () => void
  onNavigate: () => void
}

const STORY = [
  {
    eyebrow: '01 / THE FACTORY',
    title: 'The factory never stopped.',
    description: 'Thirty years ago, everyone left Halloway Toy Works. The machines kept running. And Bolt kept waiting.',
    image: '/story/unit-7.jpg',
    alt: 'Bolt standing alone in an abandoned toy factory.',
  },
  {
    eyebrow: '02 / THE TEAM',
    title: 'Someone came back.',
    description: 'The Ninja has come to bring Bolt home. One climbs walls. The other builds paths. Neither can escape alone.',
    image: '/story/rescue.jpg',
    alt: 'The Ninja reaching Bolt inside the old factory.',
  },
  {
    eyebrow: '03 / THE MISSION',
    title: 'Get them both home.',
    description: 'Collect gems, recover both keys, and reach the two exits. Keep an eye on the sinking toy pits.',
    image: '/story/escape-plan.jpg',
    alt: 'The Ninja and Bolt activating the escape lift together.',
  },
] as const

export default function StoryModal({ mode = 'onboarding', onBegin, onNavigate }: StoryModalProps) {
  const [page, setPage] = useState(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const lastPage = STORY.length - 1
  const slide = STORY[page]
  const isIntro = mode === 'onboarding'

  useEffect(() => { titleRef.current?.focus() }, [page, mode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault()
        onBegin()
      } else if (event.code === 'ArrowRight' && page < lastPage) {
        event.preventDefault()
        onNavigate()
        setPage(v => v + 1)
      } else if (event.code === 'ArrowLeft' && page > 0) {
        event.preventDefault()
        onNavigate()
        setPage(v => v - 1)
      } else if (event.code === 'Enter' && page === lastPage) {
        event.preventDefault()
        onBegin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, lastPage, onBegin, onNavigate])

  const go = (next: number) => {
    onNavigate()
    setPage(next)
  }

  return (
    <div className={`story-overlay ${isIntro ? 'is-onboarding' : 'is-popup'}`}
      role="dialog" aria-modal="true" aria-labelledby="story-title" aria-describedby="story-description">
      <section className={`story-card ${isIntro ? 'story-onboarding' : 'story-popup'}`}>
        <div className="story-art">
          <img key={slide.image} src={slide.image} alt={slide.alt} />
          <header className="story-art-header">
            <span><span className="story-lamp" aria-hidden="true" /> HALLOWAY TOY WORKS</span>
            <button className="story-skip" type="button" onClick={onBegin}>
              {isIntro ? 'SKIP INTRO' : 'CLOSE'} <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className="story-image-caption" aria-hidden="true">NINJA & BOLT / CO-OP RESCUE</div>
        </div>

        <div className="story-editorial">
          <div className="story-narrative" key={slide.title}>
            <span className="story-kicker">{slide.eyebrow}</span>
            <h2 id="story-title" ref={titleRef} tabIndex={-1}>{slide.title}</h2>
            <p id="story-description">{slide.description}</p>
          </div>
          <div className="story-side">
            {page === 1 ? (
              <div className="story-roles" aria-label="Character abilities">
                <div><img src="/sprites/ninja-portrait.png" alt="" /><span><strong>THE NINJA</strong><small>↑ CLIMB WALLS</small></span></div>
                <div><img src="/sprites/robot-portrait.png" alt="" /><span><strong>BOLT</strong><small>Q BUILD CRATES</small></span></div>
              </div>
            ) : page === 2 ? (
              <div className="story-checks" aria-label="Mission checklist">
                <span>◆ COLLECT GEMS</span><span>⌕ FIND BOTH KEYS</span><span>⇥ REACH BOTH EXITS</span>
              </div>
            ) : (
              <div className="story-stamp"><strong>BOLT</strong><span>AWAITING RESCUE</span></div>
            )}
          </div>
        </div>

        <footer className="story-footer">
          <div className="story-pagination" aria-label={`Scene ${page + 1} of ${STORY.length}`}>
            <span>0{page + 1} <em>/ 0{STORY.length}</em></span>
            <div className="story-progress-bars" aria-hidden="true">
              {STORY.map((_, i) => <i key={i} className={i <= page ? 'is-active' : ''} />)}
            </div>
          </div>
          <div className="story-actions">
            {page > 0 && <button className="story-back" type="button" onClick={() => go(page - 1)}>BACK</button>}
            {page < lastPage ? (
              <button className="story-next" type="button" onClick={() => go(page + 1)}>NEXT SCENE <span aria-hidden="true">→</span></button>
            ) : (
              <button className="story-next" type="button" onClick={onBegin}>{isIntro ? 'BEGIN RESCUE' : 'BACK TO GAME'} <span aria-hidden="true">→</span></button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
