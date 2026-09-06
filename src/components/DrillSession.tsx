import { useCallback, useMemo, useState } from 'react';
import Drill from './Drill';
import { useStore } from '../state/store';
import { MODE_LABELS, type Attempt } from '../services/model';

interface Props {
  /** File figée par l'appelant : elle ne doit pas bouger sous les pieds de l'utilisateur. */
  ids: string[];
  /** Appelé quand la file est épuisée, avec tous les essais de la session. */
  onFinished: (done: Attempt[]) => void;
  onQuit: () => void;
  /** Étiquette affichée à côté de la progression (« Révision », « Série »…). */
  label: string;
}

/**
 * Enchaîne une file d'exercices : un seul écran, on passe au suivant sans repasser
 * par une liste. Partagé par la révision espacée et la série d'intuition, qui ne
 * diffèrent que par la façon dont la file est constituée.
 */
export default function DrillSession({ ids, onFinished, onQuit, label }: Props) {
  const sequences = useStore(s => s.sequences);
  const recordAttempt = useStore(s => s.recordAttempt);

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Attempt[]>([]);

  const byId = useMemo(() => new Map(sequences.map(s => [s.id, s])), [sequences]);
  const current = byId.get(ids[index]);

  const onFinish = useCallback((a: Attempt) => {
    void recordAttempt(a);
    setDone(d => [...d, a]);
  }, [recordAttempt]);

  const next = useCallback(() => {
    const at = index + 1;
    setIndex(at);
    if (at >= ids.length) onFinished(done);
  }, [index, ids.length, done, onFinished]);

  if (!current) {
    // La séquence a disparu (suppression) : on saute au suivant.
    if (index < ids.length) {
      return (
        <div className="empty">
          Exercice introuvable. <button className="sm" onClick={next}>Passer au suivant</button>
        </div>
      );
    }
    return null;
  }

  const position = `${index + 1} / ${ids.length}`;
  const perfect = done.filter(a => a.score === a.max).length;

  const progress = (
    <div className="card">
      <h3>{label}</h3>
      <div className="stat-row">
        <div className="stat">
          <div className="k">Exercice</div>
          <div className="v" style={{ fontSize: '1.1rem' }}>{position}</div>
        </div>
        <div className="stat"><div className="k">Sans faute</div><div className="v">{perfect}</div></div>
      </div>
      <p className="small muted" style={{ marginTop: '.7rem', marginBottom: 0 }}>
        {current.name} · {MODE_LABELS[current.mode]}
      </p>
      <div className="toolbar" style={{ justifyContent: 'flex-start', marginTop: '.6rem' }}>
        <button className="sm danger" onClick={onQuit}>Quitter</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{label} <span className="tag accent">{position}</span></h1>
          <p className="sub">{current.name} · {MODE_LABELS[current.mode]}</p>
        </div>
      </div>
      <Drill
        key={current.id}
        sequence={current}
        onFinish={onFinish}
        autoStart
        aside={progress}
        afterActions={
          <button className="primary" onClick={next}>
            {index + 1 >= ids.length ? 'Terminer' : 'Suivant'}
          </button>
        }
      />
    </>
  );
}
