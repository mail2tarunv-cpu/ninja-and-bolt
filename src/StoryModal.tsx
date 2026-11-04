import { useEffect, useRef, useState } from 'react'

type StoryModalProps = {
  onBegin: () => void
  onNavigate: () => void
}

type StorySlide = {
  eyebrow: string
  title: string
  description: string
  image: string
  alt: string
}

const STORY: StorySlide[] = [
  {
    eyebrow: '01 / THE FACTORY',
    title: 'Thirty years. Still waiting.',
    description: 'Halloway Toy Works closed its doors. The machines never stopped. And Unit 7 never stopped waiting for someone to come back.',
    image: '/story/unit-7.jpg',
    alt: 'Unit 7 standing alone among abandoned machinery in the toy factory.',
  },
  {
    eyebrow: '02 / THE RESCUE',
    title: 'Someone came back.',
    description: 'The Ninja found Unit 7. One can climb the walls. The other can build a way across. Neither gets out alone.',
    image: '/story/rescue.jpg',
    alt: 'The Ninja reaching out to Unit 7 beneath the old factory lights.',
  },
  {
    eyebrow: '03 / YOUR MISSION',
    title: 'Get them both home.',
    description: 'Find a key for each character, collect gems for your score, and get them both to the exit doors. Watch the factory floor.',
    image: '/story/escape-plan.jpg',
    alt: 'The Ninja and Unit 7 working together to reach the factory exit.',
  },
]

export default function StoryModal({ onBegin, onNavigate }: StoryModalProps) {
  const [page, setPage] = useState(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const slide = STORY[page]
  const lastPage = STORY.length - 1

  useEffect(() => {
    titleRef.current?.focus()
  }, [page])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault()
        onBegin()
      } else if (event.code === 'ArrowRight' && page < lastPage) {
        event.preventDefault()
        onNavigate()
        setPage((current) => current + 1)
      } else if (event.code === 'ArrowLeft' && page > 0) {
        event.preventDefault()
        onNavigate()
        setPage((current) => current - 1)
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
    <div className="story-overlay" role="dialog" aria-modal="true" aria-labelledby="story-title" aria-describedby="story-description">
      <section className="story-card">
        <div className="story-art">
          <img key={slide.image} src={slide.image} alt={slide.alt} />
          <header className="story-art-header">
            <span><span className="story-lamp" aria-hidden="true" /> HALLOWAY TOY WORKS</span>
            <button className="story-skip" type="button" onClick={onBegin}>SKIP INTRO <span aria-hidden="true">×</span></button>
          </header>
          <div className="story-image-caption" aria-hidden="true">A STORY OF TWO UNLIKELY PARTNERS</div>
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
                <div><img src="/sprites/robot-portrait.png" alt="" /><span><strong>UNIT 7</strong><small>Q BUILD CRATES</small></span></div>
              </div>
            ) : page === 2 ? (
              <div className="story-checks" aria-label="Mission checklist"><span>◆ COLLECT GEMS</span><span>⌕ FIND BOTH KEYS</span><span>⇥ REACH BOTH EXITS</span></div>
            ) : (
              <div className="story-stamp"><strong>UNIT 07</strong><span>AWAITING RESCUE</span></div>
            )}
          </div>
        </div>

        <footer className="story-footer">
          <div className="story-pagination" aria-label={'Scene ' + (page + 1) + ' of ' + STORY.length}>
            <span>0{page + 1} <em>/ 0{STORY.length}</em></span>
            <div className="story-progress-bars" aria-hidden="true">
              {STORY.map((_, i) => <i key={i} className={i <= page ? 'is-active' : ''} />)}
            </div>
          </div>
          <div className="story-actions">
            {page > 0 && <button className="story-back" onClick={() => go(page - 1)}>BACK</button>}
            {page < lastPage ? (
              <button className="story-next" onClick={() => go(page + 1)}>NEXT SCENE <span aria-hidden="true">→</span></button>
            ) : (
              <button className="story-next" onClick={onBegin}>BEGIN RESCUE <span aria-hidden="true">→</span></button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
