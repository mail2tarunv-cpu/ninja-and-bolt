import { useEffect, useRef, useState } from 'react'
import GameIcon from './GameIcon'
import './story.css'

type StoryModalProps = {
  mode?: 'onboarding' | 'popup'
  onBegin: () => void
  onNavigate: () => void
}

const STORY = [
  {
    eyebrow: '01 / THE RESCUE',
    title: 'Someone came back for Bolt.',
    description: 'Bolt has been waiting to escape the abandoned Halloway Toy factory. Ninja’s here to bring him home.',
    image: '/story/rescue-v2.png',
    alt: 'Ninja arrives through a factory window and reaches toward Bolt on a workbench.',
  },
  {
    eyebrow: '02 / TEAMWORK',
    title: 'Bolt builds. Ninja climbs.',
    description: 'Bolt builds paths across factory waste and Ninja climbs walls. They’ll need to work together to escape.',
    image: '/story/teamwork-v2.png',
    alt: 'Bolt places blocks across a gap while Ninja climbs a purple-marked factory wall.',
  },
  {
    eyebrow: '03 / THE ESCAPE',
    title: 'Get them both home.',
    description: 'Collect gems, find both keys, and unlock both exits together.',
    image: '/story/escape-v2.png',
    alt: 'Bolt and Ninja face two locked exits with gold and purple keys nearby.',
  },
] as const

export default function StoryModal({ mode = 'onboarding', onBegin, onNavigate }: StoryModalProps) {
  const [page, setPage] = useState(0)
  const cardRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const lastPage = STORY.length - 1
  const slide = STORY[page]

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    STORY.forEach(slide => { const image = new Image(); image.src = slide.image })
    return () => previous?.focus()
  }, [])
  useEffect(() => { titleRef.current?.focus() }, [page])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault()
        onBegin()
      } else if (event.code === 'ArrowRight' && page < lastPage) {
        event.preventDefault(); onNavigate(); setPage(v => v + 1)
      } else if (event.code === 'ArrowLeft' && page > 0) {
        event.preventDefault(); onNavigate(); setPage(v => v - 1)
      } else if (event.code === 'Enter' && document.activeElement === titleRef.current) {
        event.preventDefault()
        if (page === lastPage) onBegin()
        else { onNavigate(); setPage(v => v + 1) }
      } else if (event.key === 'Tab') {
        const buttons = Array.from(cardRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
          event.preventDefault(); last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, lastPage, onBegin, onNavigate])

  const go = (next: number) => { onNavigate(); setPage(next) }

  return (
    <div className="cinema-overlay" role="dialog" aria-modal="true" aria-labelledby="story-title" aria-describedby="story-description">
      <section className="cinema-card" ref={cardRef}>
        <div className="cinema-picture">
          <img key={slide.image} src={slide.image} alt={slide.alt} />
        </div>
        <header className="cinema-header">
          <span>HALLOWAY TOYS</span>
          <button type="button" className="cinema-skip" onClick={onBegin}>
            {mode === 'onboarding' ? 'Skip intro' : 'Close'} <GameIcon name="close" />
          </button>
        </header>
        <div className="cinema-caption">
          <div key={page} className="cinema-copy">
            <span className="cinema-kicker">{slide.eyebrow}</span>
            <h2 id="story-title" ref={titleRef} tabIndex={-1}>{slide.title}</h2>
            <p id="story-description">{slide.description}</p>
            {page === 1 && <div className="cinema-abilities" aria-label="Character controls">
              <span><kbd>Q</kbd> Bolt builds blocks</span>
              <span><kbd>↑</kbd><kbd>↓</kbd> Ninja climbs walls</span>
            </div>}
          </div>
          <footer className="cinema-footer">
            <div className="cinema-progress" aria-label={`Scene ${page + 1} of ${STORY.length}`}>
              {STORY.map((_, i) => <span key={i} className={i === page ? 'current' : i < page ? 'visited' : ''} />)}
              <small>{page + 1} / {STORY.length}</small>
            </div>
            <div className="cinema-actions">
              {page > 0 && <button className="cinema-back" type="button" onClick={() => go(page - 1)}>Back</button>}
              <button className="cinema-next" type="button" onClick={() => page < lastPage ? go(page + 1) : onBegin()}>
                {page < lastPage ? 'Next' : mode === 'onboarding' ? 'Let’s play' : 'Back to game'}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  )
}
