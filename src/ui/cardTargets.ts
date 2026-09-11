// Calcula, pra cada carta, quais alvos são realmente válidos agora — sempre
// perguntando pro motor (validateCard), nunca reimplementando a regra aqui.
// Assume profundidade 2 (o único valor que a UI hoje oferece em SetupScreen).

import { getNode, validateCard } from '../engine';
import type { CardId, GameState, Path, Player } from '../engine';

export const BOARD_PATHS: Path[] = Array.from({ length: 9 }, (_, i) => [i]);
export const CELL_PATHS: Path[] = BOARD_PATHS.flatMap((b) =>
  Array.from({ length: 9 }, (_, c) => [...b, c]),
);

const BOARD_ONLY: CardId[] = [
  'devorador-de-tabuleiro',
  'supernova',
  'bolha-protecao',
  'tempestade',
  'tsunami',
  'mare-virada',
];
const CELL_TARGET: CardId[] = ['salto-estelar', 'buraco-negro'];

export type CardShape = 'board' | 'cell' | 'star' | 'current';

export function shapeOf(card: CardId): CardShape {
  if (BOARD_ONLY.includes(card)) return 'board';
  if (CELL_TARGET.includes(card)) return 'cell';
  if (card === 'estrela-da-sorte') return 'star';
  return 'current'; // correnteza
}

export function validBoards(state: GameState, player: Player, card: CardId): Path[] {
  return BOARD_PATHS.filter((p) => validateCard(state, { player, card, path: p }) === null);
}

export function validCells(state: GameState, player: Player, card: CardId): Path[] {
  return CELL_PATHS.filter((p) => validateCard(state, { player, card, path: p }) === null);
}

// Estrela da sorte: pra uma posição (0-8), quais tabuleiros a aceitam.
export function boardsForPosition(state: GameState, player: Player, cellIndex: number): Path[] {
  return BOARD_PATHS.filter(
    (p) => validateCard(state, { player, card: 'estrela-da-sorte', path: p, path2: p, cellIndex }) === null,
  );
}

// Correnteza: minhas marcas em tabuleiros abertos (origem possível).
export function ownMarks(state: GameState, player: Player): Path[] {
  return CELL_PATHS.filter((p) => getNode(state.board, p) === player);
}

// Correnteza: células vazias no mesmo tabuleiro da origem escolhida (destino possível).
export function emptyCellsInBoard(state: GameState, boardPath: Path): Path[] {
  return Array.from({ length: 9 }, (_, c) => [...boardPath, c]).filter(
    (p) => getNode(state.board, p) === null,
  );
}

// Correnteza: minhas marcas que têm pelo menos um destino válido agora.
export function correntezaOrigins(state: GameState, player: Player): Path[] {
  return ownMarks(state, player).filter((origin) =>
    emptyCellsInBoard(state, origin.slice(0, -1)).some(
      (dest) => validateCard(state, { player, card: 'correnteza', path: origin, path2: dest }) === null,
    ),
  );
}

// Correnteza: destinos válidos pra uma origem já escolhida.
export function correntezaDestinations(state: GameState, player: Player, origin: Path): Path[] {
  return emptyCellsInBoard(state, origin.slice(0, -1)).filter(
    (dest) => validateCard(state, { player, card: 'correnteza', path: origin, path2: dest }) === null,
  );
}

// Estrela da sorte (RN-CARTAS-05): posições com pelo menos dois tabuleiros candidatos.
export function starPositions(state: GameState, player: Player): number[] {
  return Array.from({ length: 9 }, (_, i) => i).filter(
    (i) => boardsForPosition(state, player, i).length >= 2,
  );
}
