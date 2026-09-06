import { useState } from 'react';
import Goban from './Goban';
import { indexToLabel } from '../core/coords';
import type { Color } from '../core/types';

export interface GuessAnswer {
  /** La bonne réponse : celle qu'il faut trouver. */
  answer: number | null;
  /** Autres coups comptés justes. */
  accept: number[];
  /** Coup réellement joué dans la partie, quand ce n'est pas la bonne réponse. */
  playedInGame?: number | null;
}

interface Props extends GuessAnswer {
  size: number;
  stones: Uint8Array;
  /** Couleur au trait. */
  color: Color;
  onChange: (value: GuessAnswer) => void;
}

/**
 * Désigne la bonne réponse d'un exercice « deviner le coup ».
 *
 * C'est indispensable dès qu'on travaille sur ses propres parties : le coup qu'on y a
 * joué est souvent justement l'erreur, il ne peut donc pas servir de référence. On
 * pointe alors le coup qu'il fallait jouer, et le coup réel devient le contre-exemple.
 */
export default function GuessEditor({
  size, stones, color, answer, accept, playedInGame, onChange,
}: Props) {
  const [picking, setPicking] = useState<'answer' | 'accept'>('answer');

  const handle = (point: number) => {
    if (stones[point] !== 0) return; // intersection occupée : rien à désigner
    if (picking === 'answer') {
      onChange({ answer: point, accept: accept.filter(p => p !== point), playedInGame });
      return;
    }
    const has = accept.includes(point);
    onChange({
      answer,
      accept: has ? accept.filter(p => p !== point) : [...accept, point],
      playedInGame,
    });
  };

  const ghosts = [
    ...(answer !== null ? [{ point: answer, color, label: '✓', tone: 'good' as const }] : []),
    ...accept.map(p => ({ point: p, color, label: '+', tone: 'good' as const })),
    ...(playedInGame !== null && playedInGame !== undefined && playedInGame !== answer
      ? [{ point: playedInGame, color, label: '✗', tone: 'bad' as const }]
      : []),
  ];

  return (
    <div className="split">
      <div>
        <div className="board-wrap">
          <Goban size={size} stones={stones} ghosts={ghosts} cursor={color} onPoint={handle} />
        </div>
        <div className="toolbar">
          <button className={picking === 'answer' ? 'primary' : ''} onClick={() => setPicking('answer')}>
            Désigner la bonne réponse
          </button>
          <button className={picking === 'accept' ? 'primary' : ''} onClick={() => setPicking('accept')}>
            Ajouter une variante
          </button>
        </div>
        <p className="small muted" style={{ textAlign: 'center', marginTop: '.5rem' }}>
          {picking === 'answer'
            ? 'Clique sur le coup qu’il fallait jouer.'
            : 'Clique pour ajouter ou retirer un coup également accepté.'}
        </p>
      </div>

      <aside>
        <div className="card">
          <h3>Réponse attendue</h3>
          <div className="movelist" style={{ marginBottom: '.7rem' }}>
            {answer === null
              ? <span className="small muted">Aucune : clique sur le goban.</span>
              : <span className="movechip current">✓ {indexToLabel(answer, size)}</span>}
            {accept.map(p => (
              <button
                key={p} className="movechip" style={{ cursor: 'pointer' }}
                onClick={() => onChange({ answer, accept: accept.filter(x => x !== p), playedInGame })}
                title="Retirer cette variante"
              >
                + {indexToLabel(p, size)} ×
              </button>
            ))}
          </div>

          {playedInGame !== null && playedInGame !== undefined && (
            <p className="small muted" style={{ margin: 0 }}>
              Coup joué dans la partie : <strong>{indexToLabel(playedInGame, size)}</strong>
              {playedInGame === answer
                ? ' — c’est aussi la réponse attendue.'
                : ' — il sera montré comme contre-exemple à la correction.'}
            </p>
          )}
        </div>

        <div className="card">
          <h3>Pourquoi désigner soi-même</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Sur une partie plus forte que toi, le coup joué fait une bonne référence.
            Sur les tiennes, non : c’est souvent l’erreur que tu veux justement corriger.
          </p>
        </div>
      </aside>
    </div>
  );
}
