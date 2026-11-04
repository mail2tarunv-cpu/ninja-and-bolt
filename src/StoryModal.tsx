import { useEffect, useRef, useState } from 'react'

type StoryModalProps = {
  onBegin: () => void
  onNavigate: () => void
}

const STORY = [
  {
    kicker: '01  /  HALLOWAY TOY WORKS',
    title: 'The night shift never ended.',
    description: 'Thirty years ago, the factory was abandoned. The machines kept running. And Unit 7 kept waiting.',
    image: '/story/unit-7.jpg',
    alt: 'Unit 7 waiting alone in the abandoned factory.',
  },
  {
    kicker: '02  /  AN UNLIKELY PAIR',
    title: 'Someone finally came back.',
    description: 'The Ninja climbs where Unit 7 cannot. Unit 7 builds the bridges the Ninja needs.',
    image: '/story/rescue.jpg',
    alt: 'The Ninja reaches out to Unit 7 in the abandoned factory.',
  },
  {
    kicker: '03  /  THE RESCUE',
    title: 'One way out. Together.',
    description: 'Collect gems, find both keys and reach the exit doors. Nobody escapes alone.',
    image: '/story/escape-plan.jpg',
    alt: 'The Ninja and Unit 7 activating a lift in the factory.',
  },
] as const

export default function StoryModal({ onBegin, onNavigate }: StoryModalProps) {
  const [page, setPage] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastPage = STORY.length - 1
  const slide = STORY[page]

  useEffect(() => {
    headingRef.current?.focus()
  }, [page])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault()
        onBegin()
      }
      if (event.code === 'ArrowRight' && page < lastPage) {
        event.preventDefault()
        onNavigate()
        setPage((value) => value + 1)
      }
      if (event.code === 'ArrowLeft' && page > 0) {
        event.preventDefault()
        onNavigate()
        setPage((value) => value - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lastPage, onBegin, onNavigate, page])

  return (
    <div className="story-overlay" role="dialog" aria-modal="true" aria-labelledby="story-title" aria-describedby="story-description">
      <section className="story-stage">
        <div className="story-stage-art" key={slide.image}>
          <img src={slide.image} alt={slide.alt} />
        </div>
        <div className="story-stage-shade" aria-hidden="true" />

        <header className="story-topline">
          <span className="story-series"><span className="story-series-mark" aria-hidden="true">✳</span> HALLOWAY TOY WORKS <span className="story-series-divider">/</span> RESCUE FILE 07</span>
          <button className="story-skip" onClick={onBegin}>SKIP INTRO <span aria-hidden="true">↗</span></button>
        </header>

        <div className="story-presentation">
          <div className="story-copy" key={slide.title}>
            <span className="story-kicker">{slide.kicker}</span>
            <h2 ref={headingRef} tabIndex={-1} id="story-title">{slide.title}</h2>
            <p id="story-description">{slide.description}</p>

            {page === 1 && (
              <div className="story-abilities" aria-label="Character abilities">
                <div className="story-ability">
                  <img src="/sprites/ninja-portrait.png" alt="" />
                  <span><b>THE NINJA</b><small>↑ CLIMB WALLS</small></span>
                </div>
                <div className="story-ability">
                  <img src="/sprites/robot-portrait.png" alt="" />
                  <span><b>UNIT 7</b><small>Q BUILD CRATES</small></span>
                </div>
              </div>
            )}
            {page === 2 && (
              <div className="story-objectives" aria-label="Mission objectives">
                <span>◇ 6 GEMS</span><span>⚿ 2 KEYS</span><span>⇥ 2 EXITS</span>
              </div>
            )}
          </div>
        </div>

        <footer className="story-bottomline">
          <div className="story-page-count" aria-label={`Slide ${page + 1} of ${STORY.length}`}>
            <strong>0{page + 1}</strong><span> / 0{STORY.length}</span>
            <div className="story-progress-bars" aria-hidden="true">
              {STORY.map((_, index) => <i key={index} className={index <= page ? 'is-active' : ''} />)}
            </div>
          </div>
          <div className="story-actions">
            <button className="story-back" onClick={() => { onNavigate(); setPage((value) => Math.max(0, value - 1)) }} disabled={page === 0}>BACK</button>
            {page < lastPage ? (
              <button className="story-next" onClick={() => { onNavigate(); setPage((value) => Math.min(lastPage, value + 1)) }}>CONTINUE <span aria-hidden="true">→</span></button>
            ) : (
              <button className="story-next" onClick={onBegin}>BEGIN RESCUE <span aria-hidden="true">→</span></button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
