import { buildReplay } from '../core/replay';
import type { Sequence, StoredGame } from './model';

/**
 * Données de démonstration : une vraie partie OGS et deux séquences prêtes à jouer,
 * pour qu'un nouveau visiteur puisse essayer l'exercice sans rien importer.
 */

export const DEMO_GAME_ID = 'ogs:11303468';

/** Partie OGS 11303468, téléchargée telle quelle depuis /api/v1/games/11303468/sgf. */
export const DEMO_SGF = "(;FF[4]\nCA[UTF-8]\nGM[1]\nDT[2018-01-16]\nPC[OGS: https://online-go.com/game/11303468]\nGN[Tournament Game: Monthly Simultaneous McMahon 2016-06-16 17:00 (17914) R:3 (crodnu vs dorota)]\nPB[dorota]\nPW[crodnu]\nBR[6k]\nWR[1k]\nTM[259200]OT[86400 fischer]\nRE[W+45.5]\nSZ[19]\nKM[6.5]\nRU[Japanese]\nC[crodnu: Hi!\n]\n;B[pp]\nC[crodnu: Hi!\n]\n(;W[qd]\n(;B[dd]\n(;W[cq]\n(;B[ep]\n(;W[do]\n(;B[dp]\n(;W[cp]\n(;B[eo]\n(;W[dn]\n(;B[er]\n(;W[cj]\n(;B[jq]\n(;W[oc]\n(;B[qg]\n(;W[qn]\n(;B[ql]\n(;W[qq]\n(;B[qp]\n(;W[pq]\n(;B[op]\n(;W[rp]\n(;B[ro]\n(;W[rq]\n(;B[qo]\n(;W[nq]\n(;B[oq]\n(;W[or]\n(;B[pn]\n(;W[jd]\n(;B[gc]\n(;W[qi]\n(;B[og]\n(;W[oi]\n(;B[re]\n(;W[rd]\n(;B[qe]\n(;W[pe]\n(;B[pf]\n(;W[mi]\n(;B[lc]\n(;W[jc]\n(;B[le]\n(;W[mf]\n(;B[oe]\n(;W[nd]\n(;B[pd]\n(;W[pc]\n(;B[od]\n(;W[nc]\n(;B[ne]\n(;W[me]\n(;B[md]\n(;W[lf]\n(;B[ke]\n(;W[ie]\n(;B[jf]\n(;W[ge]\n(;B[jg]\n(;W[kh]\n(;B[hg]\n(;W[ff]\n(;B[df]\n(;W[fh]\n(;B[ii]\n(;W[kj]\n(;B[ib]\n(;W[kb]\n(;B[lb]\n(;W[ik]\n(;B[jb]\n(;W[kc]\n(;B[ka]\n(;W[np]\n(;B[no]\n(;W[lp]\n(;B[mo]\n(;W[lo]\n(;B[nk]\n(;W[om]\n(;B[pm]\n(;W[on]\n(;B[oo]\n(;W[ol]\n(;B[ok]\n(;W[mm]\n(;B[ml]\n(;W[lm]\n(;B[nm]\n(;W[nn]\n(;B[mn]\n(;W[nl]\n(;B[pl]\n(;W[nm]\n(;B[ln]\n(;W[kn]\n(;B[km]\n(;W[ll]\n(;B[ko]\n(;W[jn]\n(;B[mp]\n(;W[mq]\n(;B[mk]\n(;W[kq]\n(;B[jo]\n(;W[jm]\n(;B[kl]\n(;W[lk]\n(;B[jl]\n(;W[il]\n(;B[in]\n(;W[im]\n(;B[hn]\n(;W[pk]\n(;B[pj]\n(;W[rn]\n(;B[so]\n(;W[qk]\n(;B[rl]\n(;W[qj]\n(;B[rm]\n(;W[iq]\n(;B[kp]\n(;W[lq]\n(;B[jr]\n(;W[io]\n(;B[jp]\n(;W[ip]\n(;B[ir]\n(;W[gp]\n(;B[hr]\n(;W[gn]\n(;B[hm]\n(;W[go]\n(;B[gm]\n(;W[fn]\n(;B[fl]\n(;W[en]\n(;B[gj]\n(;W[gr]\n(;B[gq]\n(;W[fq]\n(;B[ki]\n(;W[ji]\n(;B[lj]\n(;W[kk]\n(;B[jj]\n(;W[li]\n(;B[gh]\n(;W[fg]\n(;B[fi]\n(;W[dh]\n(;B[jh]\n(;W[ki]\n(;B[ij]\n(;W[jk]\n(;B[hk]\n(;W[rb]\n(;B[nh]\n(;W[ni]\n(;B[oa]\n(;W[na]\n(;B[nb]\n(;W[ob]\n(;B[ma]\n(;W[pa]\n(;B[rh]\n(;W[dl]\n(;B[ej]\n(;W[cc]\n(;B[dc]\n(;W[db]\n(;B[eb]\n(;W[cb]\n(;B[bd]\n(;W[ec]\n(;B[fb]\n(;W[cd]\n(;B[ce]\n(;W[ed]\n(;B[de]\n(;W[bc]\n(;B[be]\n(;W[bg]\n(;B[ee]\n(;W[fd]\n(;B[fe]\n(;W[hf]\n(;B[gd]\n(;W[ld]\n(;B[mc]\n(;W[na]\n(;B[nr]\n(;W[mr]\n(;B[oa]\n(;W[qb]\n(;B[kd]\n(;W[se]\n(;B[sf]\n(;W[sd]\n(;B[di]\n(;W[ci]\n(;B[eh]\n(;W[eg]\n(;B[dg]\n(;W[ei]\n(;B[qc]\n(;W[rc]\n(;B[eh]\n(;W[nf]\n(;B[of]\n(;W[ei]\n(;B[pr]\n(;W[ns]\n(;B[eh]\n(;W[rf]\n(;B[sg]\n(;W[ei]\n(;B[hq]\n(;W[fr]\n(;B[eh]\n(;W[qf]\n(;B[rg]\n(;W[ei]\n(;B[fp]\n(;W[eq]\n(;B[eh]\n(;W[ba]\n(;B[ab]\n(;W[ei]\n(;B[dq]\n(;W[dr]\n(;B[eh]\n(;W[da]\n(;B[ac]\n(;W[ei]\n(;B[cr]\n(;W[fo]\n(;B[eh]\n(;W[je]\n(;B[kf]\n(;W[ei]\n(;B[hp]\n(;W[ho]\n(;B[eh]\n(;W[hl]\n(;B[gl]\n(;W[ei]\n(;B[gg]\n(;W[dj]\n(;B[gf]\n(;W[ek]\n(;B[lg]\n(;W[fj]\n(;B[gi]\n(;W[na]\n(;B[mb]\n(;W[oa]\n(;B[fk]\n(;W[ej]\n(;B[sp]\n(;W[qr]\n(;B[sq]\n(;W[sr]\n(;B[sn]\n(;W[cg]\n(;B[af]\n(;W[ag]\n(;B[bf]\n(;W[rk]\n(;B[sl]\n(;W[ri]\n(;B[ph]\n(;W[pi]\n(;B[mh]\n(;W[oh]\n(;B[qh]\n(;W[kg]\n(;B[lh]\n(;W[sj]\n(;B[em]\n(;W[dm]\n(;B[ef]\n(;W[eh]\n(;B[gk]\n(;W[]\n(;B[]\nC[crodnu: thanks for the game!\n]\n)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))";

interface DemoSpec {
  id: string;
  name: string;
  /** Nombre de coups joués avant le début de la séquence. */
  startAt: number;
  length: number;
  timerSeconds: number;
  notes: string;
}

const SPECS: DemoSpec[] = [
  {
    id: 'demo-centre',
    name: 'Combat au centre',
    startAt: 60,
    length: 6,
    timerSeconds: 30,
    notes: "Six coups au milieu du plateau, là où aucun bord ne sert de repère. "
      + "C'est le cas le plus dur à tenir de tête, et donc le plus utile à travailler.",
  },
  {
    id: 'demo-joseki',
    name: 'Joseki du coin inférieur gauche',
    startAt: 3,
    length: 8,
    timerSeconds: 40,
    notes: "Huit coups dans un coin presque vide : les bords donnent des repères. "
      + "Commence par celle-ci pour prendre le pli de l'exercice.",
  },
];

/** Reconstruit la partie et les séquences depuis le SGF, sans coordonnées écrites en dur. */
export function buildDemoData(): { game: StoredGame; sequences: Sequence[] } {
  const replay = buildReplay(DEMO_SGF);
  const { info } = replay;
  const gameLabel = `${info.players.black.name} vs ${info.players.white.name}`;
  const now = Date.now();

  const game: StoredGame = {
    id: DEMO_GAME_ID,
    source: 'ogs',
    sourceId: '11303468',
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
      moves: replay.moves
        .slice(spec.startAt, spec.startAt + spec.length)
        .map(m => ({ point: m.point, color: m.color })),
      origin: { gameId: DEMO_GAME_ID, gameLabel, moveNumber: spec.startAt },
      timerSeconds: spec.timerSeconds,
      flashMs: 400,
      notes: spec.notes,
    } satisfies Sequence;
  });

  return { game, sequences };
}
