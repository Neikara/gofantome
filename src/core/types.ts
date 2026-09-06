export type Color = 1 | 2;
export const BLACK: Color = 1;
export const WHITE: Color = 2;

/** 0 = vide, 1 = noir, 2 = blanc. Indexé par y * size + x. */
export type Stones = Uint8Array;

export interface Position {
  size: number;
  stones: Stones;
  /** Point interdit par le ko simple, ou null. */
  ko: number | null;
  captures: { black: number; white: number };
}

export interface Move {
  /** null = pass */
  point: number | null;
  color: Color;
}

export const other = (c: Color): Color => (c === 1 ? 2 : 1);
