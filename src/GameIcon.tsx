type IconName = 'help' | 'sound' | 'mute' | 'pause' | 'play' | 'restart' | 'story' | 'home' | 'close' | 'clock' | 'blocks' | 'exit' | 'gem'
const paths: Record<IconName, string> = {
 help:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 sound:'m11 5-6 4H2v6h3l6 4V5m4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
 mute:'m11 5-6 4H2v6h3l6 4V5m5 4 6 6m0-6-6 6',
 pause:'M8 5v14M16 5v14',play:'m8 4 12 8-12 8V4',restart:'M4 9a8 8 0 1 1 0 6m0-12v6h6',
 story:'M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4m8 2v15',home:'m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9',
 close:'m6 6 12 12M6 18 18 6',clock:'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 blocks:'m12 3 9 5-9 5-9-5 9-5m-9 5v9l9 5 9-5V8m-9 5v9',exit:'M10 3H4v18h6m4-14 5 5-5 5m-6-5h12',gem:'m12 3 9 9-9 9-9-9 9-9m-5 9h10',
}
export default function GameIcon({name}:{name:IconName}) {
 return <svg className="game-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>
}
