import OutcomeCard from './OutcomeCard'

type FailureModalProps = {
  role: 'robot' | 'ninja'
  hazard: 'quicksand' | 'factory waste'
  onRetry: () => void
}

export default function FailureModal({ role, hazard, onRetry }: FailureModalProps) {
  const character = role === 'robot' ? 'Bolt' : 'Ninja'
  const hazardName = hazard === 'quicksand' ? 'the sinking toy pit' : 'the factory waste'
  return <OutcomeCard failureRole={role} description={`Oh no! ${character} was lost in ${hazardName}. Try again to escape together.`} onRetry={onRetry}>
    <div className="outcome-tip">
      <strong>MISSION TIP</strong>
      <p>Bolt can build paths over {hazard === 'quicksand' ? 'the sinking toy pits' : 'the factory waste'}, then you can cross together.</p>
      <span><kbd>Q</kbd> Build blocks</span>
    </div>
  </OutcomeCard>
}
