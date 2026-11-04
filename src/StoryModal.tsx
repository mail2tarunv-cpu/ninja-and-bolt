import { useEffect, useRef, useState } from 'react'

type StoryModalProps = {
  onBegin: () => void
  onNavigate: () => void
}

type Slide = {
  kicker: string
  title: string
  description: string
  image: string
  imageAlt: string
}

const STORY: Slide[] = [
  {
    kicker: 'HALLOWAY TOY WORKS  /  30 YEARS LATER',
    title: 'The night shift never ended.',
    description: 'Thirty years ago, the furnaces overheated and everyone ran. The machines never stopped. And somewhere inside, Unit 7 kept waiting for someone to come back.',
    image: '/story/unit-7.jpg',
    imageAlt: 'Unit 7 waits alone among the abandoned toy factory machinery.',
  },
  {
    kicker: 'TWO UNLIKELY PARTNERS',
    title: 'Someone finally came back.',
    description: 'A ninja has entered the factory to bring Unit 7 home. One can climb where the other cannot. One can build the bridges the other needs.',
    image: '/story/rescue.jpg',
    imageAlt: 'A hooded ninja meets Unit 7 under the lights of the old factory.',
  },
  {
    kicker: 'MISSION 01  /  THE WAY OUT',
    title: 'No one escapes alone.',
    description: 'Build a path over broken toys, climb to the switches, collect gems for your team score, find each character’s key, and reach both escape doors.',
    image: '/story/escape-plan.jpg',
    imageAlt: 'Ninja and Unit 7 work together to activate the factory escape system.',
  },
]

export default function StoryModal({ onBegin, onNavigate }: StoryModalProps) {
  const [page, setPage] = useState(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const slide = STORY[page]

  useEffect(() => {
    titleRef.current?.focus()
  }, [page])

  return (
    <div className="story-overlay" role="dialog" aria-modal="true" aria-labelledby="story-title" aria-describedby="story-description">
      <section className="story-panel">
        <div className="story-scene" key={slide.image}>
          <img src={slide.image} alt={slide.imageAlt} />
          <div className="story-photo-fade" />
          <span className="story-scene-tag">FILE 07 — HALLOWAY TOY WORKS</span>
        </div>
        <div className="story-body">
          <div className="story-progress" aria-label={`Story page ${page + 1} of 3`}>
            <span>0{page + 1} / 03</span>
            <div className="story-progress-bars" aria-hidden="true">
              {STORY.map((_, i) => <span key={i} className={i <= page ? 'is-active' : ''} />)}
            </div>
          </div>
          <span className="story-kicker">{slide.kicker}</span>
          <h2 id="story-title" ref={titleRef} tabIndex={-1}>{slide.title}</h2>
          <p id="story-description">{slide.description}</p>

          {page === 1 && (
            <div className="story-characters">
              <article>
                <img src="/sprites/ninja-portrait.png" alt="The Ninja" />
                <div><small>THE NINJA</small><strong>Climbs walls</strong><span>Arrow keys to move and climb</span></div>
              </article>
              <article>
                <img src="/sprites/robot-portrait.png" alt="Unit 7" />
                <div><small>UNIT 7</small><strong>Builds blocks</strong><span>WASD to move · Q to build</span></div>
              </article>
            </div>
          )}
          {page === 2 && (
            <div className="story-checklist" aria-label="Mission objectives">
              <span>✦ COLLECT GEMS</span><span>⚿ FIND BOTH KEYS</span><span>⇥ REACH THE EXITS</span>
            </div>
          )}
          <div className="story-actions">
            <button className="story-back" disabled={page === 0} onClick={() => { onNavigate(); setPage(p => Math.max(0, p - 1)) }}>BACK</button>
            {page < STORY.length - 1 ? (
              <button className="story-next" onClick={() => { onNavigate(); setPage(p => Math.min(STORY.length - 1, p + 1)) }}>NEXT <span aria-hidden="true">→</span></button>
            ) : (
              <button className="story-next" onClick={onBegin}>BEGIN RESCUE <span aria-hidden="true">→</span></button>
            )}
          </div>
          {page < STORY.length - 1 && <button className="story-skip" onClick={onBegin}>SKIP INTRO</button>}
        </div>
      </section>
    </div>
  )
}
