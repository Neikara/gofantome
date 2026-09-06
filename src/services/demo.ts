import { buildReplay, turnAfter } from '../core/replay';
import { labelToIndex } from '../core/coords';
import type { DrillMode, Sequence, StoredGame } from './model';
import { newSrs } from './srs';

/**
 * Données de démonstration : une vraie partie OGS et deux séquences de lecture prêtes
 * à jouer, pour qu'un visiteur puisse essayer l'exercice sans rien importer.
 *
 * Pas d'exercice « coup à corriger » ici : il faudrait désigner le coup qu'il fallait
 * jouer, ce qui demande un jugement sur la partie qu'on ne peut pas inventer.
 */

export const DEMO_GAME_ID = 'ogs:90256275';

/** Parties de démonstration des versions précédentes, à retirer au rechargement. */
export const PREVIOUS_DEMO_GAME_IDS = ['ogs:11303468'];

/**
 * Partie OGS 90256275, depuis /api/v1/games/90256275/sgf.
 * Les commentaires de chat ont été retirés : ils n'apportent rien à l'exercice
 * et il s'agit d'échanges entre les joueurs et les spectateurs.
 */
export const DEMO_SGF = "(;FF[4]\nCA[UTF-8]\nGM[1]\nDT[2026-08-30]\nPC[OGS: https://online-go.com/game/90256275]\nGN[Partie amicale]\nPB[Drooxi]\nPW[nobi-kun]\nBR[8k]\nWR[8k]\nTM[1200]OT[15 fischer]\nRE[W+2.5]\nSZ[19]\nKM[7.5]\nRU[Chinese]\n;B[pd]\n(;W[dp]\n(;B[qp]\n(;W[dc]\n(;B[nq]\n(;W[nc]\n(;B[qf]\n(;W[pc]\n(;B[qc]\n(;W[qb]\n(;B[oc]\n(;W[pb]\n(;B[nd]\n(;W[ob]\n(;B[od]\n(;W[mc]\n(;B[ce]\n(;W[ed]\n(;B[ch]\n(;W[pp]\n(;B[pq]\n(;W[qo]\n(;B[op]\n(;W[po]\n(;B[rp]\n(;W[qq]\n(;B[ro]\n(;W[qm]\n(;B[qr]\n(;W[pj]\n(;B[cn]\n(;W[fq]\n(;B[cp]\n(;W[cq]\n(;B[bq]\n(;W[co]\n(;B[bp]\n(;W[do]\n(;B[bo]\n(;W[dn]\n(;B[cm]\n(;W[df]\n(;B[cf]\n(;W[dh]\n(;B[dg]\n(;W[eg]\n(;B[cg]\n(;W[le]\n(;B[jd]\n(;W[hc]\n(;B[jf]\n(;W[kc]\n(;B[jc]\n(;W[lg]\n(;B[ih]\n(;W[fh]\n(;B[di]\n(;W[ki]\n(;B[ji]\n(;W[kh]\n(;B[if]\n(;W[qd]\n(;B[rc]\n(;W[rd]\n(;B[qe]\n(;W[rb]\n(;B[re]\n(;W[sc]\n(;B[qi]\n(;W[qj]\n(;B[nf]\n(;W[pi]\n(;B[qh]\n(;W[jj]\n(;B[hh]\n(;W[ij]\n(;B[gi]\n(;W[fi]\n(;B[gj]\n(;W[fj]\n(;B[gk]\n(;W[el]\n(;B[fk]\n(;W[ek]\n(;B[ej]\n(;W[dj]\n(;B[eh]\n(;W[ei]\n(;B[ef]\n(;W[dh]\n(;B[ee]\n(;W[ci]\n(;B[bc]\n(;W[cb]\n(;B[fc]\n(;W[fd]\n(;B[gc]\n(;W[hd]\n(;B[gd]\n(;W[ge]\n(;B[he]\n(;W[ff]\n(;B[hb]\n(;W[nn]\n(;B[de]\n(;W[fe]\n(;B[nh]\n(;W[mj]\n(;B[jq]\n(;W[mp]\n(;B[mq]\n(;W[jo]\n(;B[lp]\n(;W[lo]\n(;B[mo]\n(;W[ln]\n(;B[dq]\n(;W[cr]\n(;B[dr]\n(;W[eq]\n(;B[br]\n(;W[er]\n(;B[cs]\n(;W[kp]\n(;B[lq]\n(;W[im]\n(;B[nj]\n(;W[nk]\n(;B[oj]\n(;W[ok]\n(;B[mi]\n(;W[li]\n(;B[mn]\n(;W[mm]\n(;B[no]\n(;W[on]\n(;B[ph]\n(;W[oh]\n(;B[og]\n(;W[oi]\n(;B[ni]\n(;W[ri]\n(;B[rh]\n(;W[rj]\n(;B[rm]\n(;W[rl]\n(;B[qn]\n(;W[pn]\n(;B[rn]\n(;W[ql]\n(;B[hq]\n(;W[kq]\n(;B[kr]\n(;W[ip]\n(;B[hp]\n(;W[ho]\n(;B[dm]\n(;W[em]\n(;B[bi]\n(;W[bj]\n(;B[bh]\n(;W[bb]\n(;B[cc]\n(;W[eb]\n(;B[kb]\n(;W[lb]\n(;B[kd]\n(;W[lc]\n(;B[bk]\n(;W[aj]\n(;B[ak]\n(;W[bd]\n(;B[cd]\n(;W[ac]\n(;B[be]\n(;W[ad]\n(;B[ae]\n(;W[ab]\n(;B[ai]\n(;W[cj]\n(;B[ck]\n(;W[iq]\n(;B[ir]\n(;W[jp]\n(;B[jr]\n(;W[gp]\n(;B[gm]\n(;W[fn]\n(;B[gr]\n(;W[sh]\n(;B[sg]\n(;W[si]\n(;B[hn]\n(;W[gn]\n(;B[hm]\n(;W[in]\n(;B[il]\n(;W[jl]\n(;B[ik]\n(;W[jk]\n(;B[hk]\n(;W[hf]\n(;B[ie]\n(;W[jh]\n(;B[ii]\n(;W[gh]\n(;B[hg]\n(;W[hj]\n(;B[hi]\n(;W[jb]\n(;B[ib]\n(;W[ka]\n(;B[gg]\n(;W[fb]\n(;B[ic]\n(;W[gb]\n(;B[id]\n(;W[mg]\n(;B[ng]\n(;W[oo]\n(;B[np]\n(;W[sf]\n(;B[rg]\n(;W[se]\n(;B[rf]\n(;W[sd]\n(;B[fg]\n(;W[eh]\n(;B[gf]\n(;W[ec]\n(;B[ga]\n(;W[fa]\n(;B[ha]\n(;W[gq]\n(;B[hr]\n(;W[me]\n(;B[ne]\n(;W[sm]\n(;B[sn]\n(;W[sl]\n(;B[dl]\n(;W[fl]\n(;B[gl]\n(;W[jg]\n(;B[kf]\n(;W[ke]\n(;B[lf]\n(;W[mf]\n(;B[ig]\n(;W[es]\n(;B[ds]\n(;W[gs]\n(;B[hs]\n(;W[fs]\n(;B[ja]\n(;W[ia]\n(;B[lj]\n(;W[mk]\n(;B[ja]\n(;W[rq]\n(;B[rr]\n(;W[ia]\n(;B[go]\n(;W[fo]\n(;B[ja]\n(;W[sq]\n(;B[sr]\n(;W[ia]\n(;B[dk]\n(;W[ja]\n(;B[ld]\n(;W[md]\n(;B[mh]\n(;W[fm]\n(;B[lh]\n(;W[kg]\n(;B[je]\n(;W[fr]\n(;B[dd]\n(;W[]\n(;B[]\n)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))\n";

interface DemoSpec {
  id: string;
  name: string;
  /** Nombre de coups joués avant le début de la séquence. */
  startAt: number;
  timerSeconds: number;
  notes: string;
  mode: DrillMode;
  tags: string[];
  /** Tranche de la ligne principale : les `length` coups suivants tels que joués. */
  length?: number;
  /**
   * Ou variation lue hors partie, en coordonnées lisibles (« H15 »). Les couleurs
   * alternent à partir de celle qui a le trait à `startAt`.
   */
  moves?: string[];
}

const SPECS: DemoSpec[] = [
  {
    id: 'demo-milieu',
    name: 'Combat du haut',
    startAt: 100,
    timerSeconds: 45,
    mode: 'blind',
    tags: ['milieu de partie'],
    // Variation lue en analyse : elle part du vrai coup 101 puis quitte la partie.
    moves: ['H15', 'G18', 'F18', 'H18', 'F15', 'G14', 'G13', 'F14', 'D15', 'F13'],
    notes: "Dix coups d'affilée dans le combat du haut. Ce n'est pas la suite jouée dans "
      + "la partie mais une variation lue en analyse : il n'y a rien à reconnaître, tout à tenir de tête.",
  },
  {
    id: 'demo-bas',
    name: 'Combat du bas',
    startAt: 108,
    length: 8,
    timerSeconds: 40,
    mode: 'blind',
    tags: ['combat'],
    notes: 'Huit coups groupés dans le bas du plateau : un contact serré, plus facile à situer. '
      + "Commence par celle-ci pour prendre le pli de l'exercice.",
  },
];

/**
 * Coups d'un exercice : soit la suite réellement jouée, soit une variation écrite en
 * clair. Une coordonnée illisible est une faute de frappe dans ce fichier, pas une
 * donnée douteuse : on la signale plutôt que de produire un exercice faux.
 */
function specMoves(spec: DemoSpec, replay: ReturnType<typeof buildReplay>) {
  const size = replay.info.size;
  if (!spec.moves) {
    return replay.moves
      .slice(spec.startAt, spec.startAt + (spec.length ?? 0))
      .map(m => ({ point: m.point, color: m.color }));
  }
  let color = turnAfter(replay, spec.startAt);
  return spec.moves.map(label => {
    const point = labelToIndex(label, size);
    if (point === null) throw new Error(`Coordonnée illisible dans la démo : « ${label} ».`);
    const move = { point, color };
    color = color === 1 ? 2 : 1;
    return move;
  });
}

/** Reconstruit la partie et les séquences depuis le SGF, sans coordonnées écrites en dur. */
export function buildDemoData(): { game: StoredGame; sequences: Sequence[] } {
  const replay = buildReplay(DEMO_SGF);
  const { info } = replay;
  const gameLabel = `${info.players.black.name} vs ${info.players.white.name}`;
  const now = Date.now();

  const game: StoredGame = {
    id: DEMO_GAME_ID,
    source: 'ogs',
    sourceId: '90256275',
    sgf: DEMO_SGF,
    addedAt: now,
    meta: {
      name: info.name,
      size: info.size,
      komi: info.komi,
      handicap: info.handicap,
      result: info.result,
      date: info.date,
      black: info.players.black.name,
      blackRank: info.players.black.rank,
      white: info.players.white.name,
      whiteRank: info.players.white.rank,
      moveCount: replay.moves.length,
    },
  };

  const sequences = SPECS.map((spec, i) => {
    const start = replay.positions[spec.startAt];
    const black: number[] = [];
    const white: number[] = [];
    for (let p = 0; p < start.stones.length; p++) {
      if (start.stones[p] === 1) black.push(p);
      else if (start.stones[p] === 2) white.push(p);
    }
    return {
      id: spec.id,
      name: spec.name,
      // Décalé pour que le tri par date garde l'ordre de ce tableau.
      createdAt: now - i * 1000,
      size: info.size,
      setup: { black, white },
      lastMove: spec.startAt > 0 ? replay.moves[spec.startAt - 1].point : null,
      moves: specMoves(spec, replay),
      origin: { gameId: DEMO_GAME_ID, gameLabel, moveNumber: spec.startAt },
      timerSeconds: spec.timerSeconds,
      flashMs: 400,
      notes: spec.notes,
      mode: spec.mode,
      tags: spec.tags,
      srs: newSrs(now),
    } satisfies Sequence;
  });

  return { game, sequences };
}
