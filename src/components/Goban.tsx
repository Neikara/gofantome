import { useMemo, useState } from 'react';
import type { Color } from '../core/types';
import { hoshi, xOf, yOf, indexToLabel } from '../core/coords';

export interface Flash {
  /** Clé unique : une même intersection peut clignoter plusieurs fois. */
  key: string;
  point: number;
  color: Color;
  tone?: 'normal' | 'error' | 'correct';
  durationMs: number;
}

export interface GobanProps {
  size: number;
  /** Pierres affichées en permanence. */
  stones: Uint8Array;
  /** Pierres éphémères qui s'effacent d'elles-mêmes. */
  flashes?: Flash[];
  /**
   * Pierres semi-transparentes : aperçu d'une séquence, ou marquage d'une intersection.
   * `tone` entoure la pierre d'un anneau vert (bonne réponse) ou rouge (coup à éviter).
   */
  ghosts?: { point: number; color: Color; label?: string | number; tone?: 'good' | 'bad' }[];
  markers?: Map<number, string | number>;
  lastMove?: number | null;
  /** Couleur du curseur ; null pour désactiver l'aperçu au survol. */
  cursor?: Color | null;
  onPoint?: (point: number) => void;
  coordinates?: boolean;
  /** Griser le plateau (fin d'exercice, chargement). */
  muted?: boolean;
  className?: string;
}

const COLS = 'ABCDEFGHJKLMNOPQRST';

export default function Goban({
  size, stones, flashes = [], ghosts = [], markers, lastMove = null,
  cursor = null, onPoint, coordinates = true, muted = false, className = '',
}: GobanProps) {
  const [hover, setHover] = useState<number | null>(null);
  const m = coordinates ? 1.5 : 0.8;
  const span = size - 1 + 2 * m;
  const stars = useMemo(() => hoshi(size), [size]);

  const cell = (i: number) => ({ cx: xOf(i, size), cy: yOf(i, size) });

  const handle = (i: number) => { if (onPoint) onPoint(i); };

  return (
    <svg
      className={`goban ${muted ? 'is-muted' : ''} ${className}`}
      viewBox={`${-m} ${-m} ${span} ${span}`}
      role="grid"
      aria-label={`Goban ${size} par ${size}`}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <radialGradient id="gf-black" cx="34%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#6b6b73" />
          <stop offset="45%" stopColor="#26262b" />
          <stop offset="100%" stopColor="#08080a" />
        </radialGradient>
        <radialGradient id="gf-white" cx="34%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#eeeae2" />
          <stop offset="100%" stopColor="#bfb8ab" />
        </radialGradient>
      </defs>

      <rect className="goban-bg" x={-m} y={-m} width={span} height={span} />

      <g className="goban-grid">
        {Array.from({ length: size }, (_, i) => (
          <g key={i}>
            <line x1={0} y1={i} x2={size - 1} y2={i} />
            <line x1={i} y1={0} x2={i} y2={size - 1} />
          </g>
        ))}
      </g>

      {stars.map(p => (
        <circle key={`h${p}`} className="goban-star" cx={xOf(p, size)} cy={yOf(p, size)} r={0.07} />
      ))}

      {coordinates && (
        <g className="goban-coords">
          {Array.from({ length: size }, (_, i) => (
            <g key={`c${i}`}>
              <text x={i} y={-0.55} textAnchor="middle">{COLS[i]}</text>
              <text x={i} y={size - 1 + 0.8} textAnchor="middle">{COLS[i]}</text>
              <text x={-0.6} y={i} textAnchor="middle" dominantBaseline="central">{size - i}</text>
              <text x={size - 1 + 0.6} y={i} textAnchor="middle" dominantBaseline="central">{size - i}</text>
            </g>
          ))}
        </g>
      )}

      {/* Pierres permanentes */}
      <g>
        {Array.from(stones).map((v, i) => {
          if (!v) return null;
          const { cx, cy } = cell(i);
          const label = markers?.get(i);
          return (
            <g key={`s${i}`} className="goban-stone">
              <circle cx={cx} cy={cy} r={0.475} fill={v === 1 ? 'url(#gf-black)' : 'url(#gf-white)'} />
              {label !== undefined && (
                <text className={`goban-label ${v === 1 ? 'on-black' : 'on-white'}`}
                      x={cx} y={cy} textAnchor="middle" dominantBaseline="central">{label}</text>
              )}
              {label === undefined && lastMove === i && (
                <circle className={`goban-last ${v === 1 ? 'on-black' : 'on-white'}`} cx={cx} cy={cy} r={0.17} />
              )}
            </g>
          );
        })}
      </g>

      {/* Pierres fantômes : aperçu d'une séquence enregistrée */}
      <g className="goban-ghosts">
        {ghosts.map((g, n) => {
          const { cx, cy } = cell(g.point);
          return (
            <g key={`g${n}-${g.point}`} className={g.tone ? `is-${g.tone}` : undefined}>
              <circle cx={cx} cy={cy} r={0.475} fill={g.color === 1 ? 'url(#gf-black)' : 'url(#gf-white)'} />
              {g.tone && <circle className="ghost-ring" cx={cx} cy={cy} r={0.44} />}
              {g.label !== undefined && (
                <text className={`goban-label ${g.color === 1 ? 'on-black' : 'on-white'}`}
                      x={cx} y={cy} textAnchor="middle" dominantBaseline="central">{g.label}</text>
              )}
            </g>
          );
        })}
      </g>

      {/* Pierres éphémères : le cœur de l'entraînement */}
      <g>
        {flashes.map(f => {
          const { cx, cy } = cell(f.point);
          return (
            <g key={f.key} className={`goban-flash tone-${f.tone ?? 'normal'}`}
               style={{ animationDuration: `${f.durationMs}ms` }}>
              <circle cx={cx} cy={cy} r={0.475} fill={f.color === 1 ? 'url(#gf-black)' : 'url(#gf-white)'} />
              <circle className="flash-ring" cx={cx} cy={cy} r={0.475} />
            </g>
          );
        })}
      </g>

      {/* Aperçu au survol */}
      {cursor && hover !== null && stones[hover] === 0 && (
        <circle className="goban-hover" cx={xOf(hover, size)} cy={yOf(hover, size)} r={0.475}
                fill={cursor === 1 ? 'url(#gf-black)' : 'url(#gf-white)'} />
      )}

      {/* Zones cliquables */}
      {onPoint && (
        <g>
          {Array.from({ length: size * size }, (_, i) => (
            <rect
              key={`t${i}`} className="goban-target"
              x={xOf(i, size) - 0.5} y={yOf(i, size) - 0.5} width={1} height={1}
              onMouseEnter={() => setHover(i)}
              onClick={() => handle(i)}
            >
              <title>{indexToLabel(i, size)}</title>
            </rect>
          ))}
        </g>
      )}
    </svg>
  );
}
