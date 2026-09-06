import BlindDrill, { type DrillProps } from './BlindDrill';
import GuessDrill from './GuessDrill';

/** Aiguille vers le moteur correspondant au mode de la séquence. */
export default function Drill(props: DrillProps) {
  return props.sequence.mode === 'guess' ? <GuessDrill {...props} /> : <BlindDrill {...props} />;
}

export type { DrillProps };
