/** Parseur SGF (FF[4]) : arbre complet avec variations, tel que produit par OGS. */

export interface SgfNode {
  props: Record<string, string[]>;
  children: SgfNode[];
}

class Reader {
  s: string;
  i: number;
  constructor(s: string, i = 0) { this.s = s; this.i = i; }
  peek() { return this.s[this.i]; }
  skipWs() { while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++; }
}

const BACKSLASH = String.fromCharCode(92);

function parseValue(r: Reader): string {
  // On entre sur '['
  r.i++;
  let out = '';
  while (r.i < r.s.length) {
    const c = r.s[r.i];
    if (c === BACKSLASH) {
      const next = r.s[r.i + 1];
      // Un backslash suivi d'un saut de ligne est une continuation : les deux disparaissent.
      if (next === '\n') { r.i += 2; continue; }
      out += next;
      r.i += 2;
      continue;
    }
    if (c === ']') { r.i++; return out; }
    out += c;
    r.i++;
  }
  return out;
}

function parseNode(r: Reader): SgfNode {
  // On entre sur ';'
  r.i++;
  const props: Record<string, string[]> = {};
  for (;;) {
    r.skipWs();
    const m = /^[A-Z]+/.exec(r.s.slice(r.i));
    if (!m) break;
    const key = m[0];
    r.i += key.length;
    const values: string[] = [];
    for (;;) {
      r.skipWs();
      if (r.peek() !== '[') break;
      values.push(parseValue(r));
    }
    props[key] = (props[key] ?? []).concat(values);
  }
  return { props, children: [] };
}

function parseTree(r: Reader): SgfNode | null {
  r.skipWs();
  if (r.peek() !== '(') return null;
  r.i++;

  let root: SgfNode | null = null;
  let tail: SgfNode | null = null;

  for (;;) {
    r.skipWs();
    const c = r.peek();
    if (c === ';') {
      const node = parseNode(r);
      if (!root) { root = node; tail = node; }
      else { tail!.children.push(node); tail = node; }
    } else if (c === '(') {
      const sub = parseTree(r);
      if (sub && tail) tail.children.push(sub);
      else if (sub && !root) { root = sub; tail = sub; }
    } else if (c === ')') {
      r.i++;
      break;
    } else if (c === undefined) {
      break;
    } else {
      r.i++; // caractère parasite, on avance
    }
  }
  return root;
}

export function parseSgf(text: string): SgfNode {
  const r = new Reader(text.replace(/^﻿/, ''));
  const tree = parseTree(r);
  if (!tree) throw new Error("SGF illisible : aucun nœud trouvé.");
  return tree;
}

const first = (n: SgfNode, key: string) => n.props[key]?.[0];

export interface SgfGame {
  size: number;
  komi: number;
  handicap: number;
  rules: string;
  result: string;
  date: string;
  name: string;
  players: { black: { name: string; rank: string }; white: { name: string; rank: string } };
  /** Pierres posées d'entrée (handicap, position de départ). */
  setup: { black: string[]; white: string[] };
  root: SgfNode;
}

export function readGameInfo(root: SgfNode): SgfGame {
  const sz = first(root, 'SZ') ?? '19';
  // SZ[19:19] pour les gobans non carrés — on ne gère que le carré.
  const size = parseInt(sz.split(':')[0], 10) || 19;
  return {
    size,
    komi: parseFloat(first(root, 'KM') ?? '0') || 0,
    handicap: parseInt(first(root, 'HA') ?? '0', 10) || 0,
    rules: first(root, 'RU') ?? '',
    result: first(root, 'RE') ?? '',
    date: first(root, 'DT') ?? '',
    name: first(root, 'GN') ?? '',
    players: {
      black: { name: first(root, 'PB') ?? 'Noir', rank: first(root, 'BR') ?? '' },
      white: { name: first(root, 'PW') ?? 'Blanc', rank: first(root, 'WR') ?? '' },
    },
    setup: { black: root.props.AB ?? [], white: root.props.AW ?? [] },
    root,
  };
}

export interface SgfMove {
  color: 1 | 2;
  /** Coordonnée SGF brute ("pd"), "" pour un pass. */
  sgf: string;
  comment?: string;
}

/** Ligne principale : on suit toujours le premier enfant. */
export function mainLine(root: SgfNode): SgfMove[] {
  const moves: SgfMove[] = [];
  let node: SgfNode | undefined = root;
  while (node) {
    const b = node.props.B?.[0];
    const w = node.props.W?.[0];
    if (b !== undefined) moves.push({ color: 1, sgf: b, comment: node.props.C?.[0] });
    else if (w !== undefined) moves.push({ color: 2, sgf: w, comment: node.props.C?.[0] });
    node = node.children[0];
  }
  return moves;
}
