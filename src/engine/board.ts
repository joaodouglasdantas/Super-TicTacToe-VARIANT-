import type { Board, Path, Player, Result, Tiebreak } from './types';

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createBoard(depth: number): Board {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new Error(`profundidade inválida: ${depth}`);
  }
  return {
    depth,
    cells: Array.from({ length: 9 }, () =>
      depth === 1 ? null : createBoard(depth - 1),
    ),
  };
}

export function isBoard(node: Board | Player | null): node is Board {
  return typeof node === 'object' && node !== null;
}

// Nó (tabuleiro ou célula) apontado por um caminho parcial a partir de `board`.
export function getNode(board: Board, path: Path): Board | Player | null {
  let node: Board | Player | null = board;
  for (const index of path) {
    if (!isBoard(node)) throw new Error(`caminho atravessa uma célula: [${path}]`);
    node = node.cells[index];
    if (node === undefined) throw new Error(`índice fora do tabuleiro: [${path}]`);
  }
  return node;
}

// Resultado de um filho: célula ocupada ou tabuleiro decidido; null se em aberto.
function childResult(node: Board | Player | null, tiebreak: Tiebreak): Result {
  return isBoard(node) ? resultOf(node, tiebreak) : node;
}

// Resultado de um tabuleiro segundo as regras configuradas.
// RN-STT-03: linha de 3 vence. RN-STT-05: desempate quando tudo decidido sem linha.
export function resultOf(board: Board, tiebreak: Tiebreak): Result {
  const results = board.cells.map((cell) => childResult(cell, tiebreak));

  for (const player of ['X', 'O'] as Player[]) {
    // Variante "conta pros dois": tabuleiro empatado casa com qualquer jogador na linha.
    // Só se aplica a filhos que são tabuleiros; célula simples nunca empata.
    const matches = (r: Result) =>
      r === player || (tiebreak === 'both' && board.depth > 1 && r === 'draw');
    if (LINES.some((line) => line.every((i) => matches(results[i])))) {
      return player;
    }
  }

  if (results.some((r) => r === null)) return null;

  // Tudo decidido, sem linha.
  if (board.depth > 1 && tiebreak === 'majority') {
    const x = results.filter((r) => r === 'X').length;
    const o = results.filter((r) => r === 'O').length;
    if (x !== o) return x > o ? 'X' : 'O';
  }
  return 'draw';
}

// Linhas fechadas pelo vencedor deste tabuleiro (REQ-RISCO-07): cada item é a
// trinca de índices que forma a linha. Derivado do estado, nada é guardado.
// Vitória por maioria e empate não têm linha, então devolvem lista vazia.
export function winningLines(board: Board, tiebreak: Tiebreak): number[][] {
  const winner = resultOf(board, tiebreak);
  if (winner !== 'X' && winner !== 'O') return [];
  const results = board.cells.map((cell) => childResult(cell, tiebreak));
  // Mesmo critério do resultOf: na variante "conta pros dois", tabuleiro
  // empatado completa a linha de qualquer jogador (RN-RISCO-02).
  const matches = (r: Result) =>
    r === winner || (tiebreak === 'both' && board.depth > 1 && r === 'draw');
  return LINES.filter((line) => line.every((i) => matches(results[i]))).map((line) => [
    ...line,
  ]);
}

// Spec CARTAS (RN-CARTAS-02): tabuleiro bloqueado por "Devorador de
// Tabuleiro"/"Maré Alta" conta como indisponível, igual a decidido, até
// `actionCount` alcançar o prazo. Sem carta nenhuma jogada (uso normal do
// motor, actionCount omitido), nunca há bloqueio.
export function isLocked(board: Board, actionCount = Infinity): boolean {
  return board.lockedUntilAction !== undefined && actionCount < board.lockedUntilAction;
}

// Spec CARTAS (Bolha de Proteção, RN-CARTAS-03): um tabuleiro protegido é um
// escudo total enquanto durar — nem jogada normal nem carta do adversário
// (quem não protegeu) entram nele. `blockedFor` omitido (uso normal do motor
// sem cartas em jogo) nunca bloqueia ninguém.
export function isProtectedAgainst(board: Board, actionCount: number, blockedFor?: Player): boolean {
  return (
    blockedFor !== undefined &&
    board.protectedUntilAction !== undefined &&
    actionCount < board.protectedUntilAction &&
    board.protectedBy !== undefined &&
    board.protectedBy !== blockedFor
  );
}

// Um tabuleiro é jogável se nem ele nem nenhum ancestral está decidido,
// bloqueado, ou protegido contra quem jogaria (`blockedFor`).
export function isPlayablePath(
  board: Board,
  path: Path,
  tiebreak: Tiebreak,
  actionCount = Infinity,
  blockedFor?: Player,
): boolean {
  let node: Board | Player | null = board;
  const unavailable = (b: Board) =>
    resultOf(b, tiebreak) !== null || isLocked(b, actionCount) || isProtectedAgainst(b, actionCount, blockedFor);
  if (unavailable(board)) return false;
  for (const index of path) {
    if (!isBoard(node)) return false;
    node = node.cells[index];
    if (node === undefined) return false;
    if (isBoard(node) && unavailable(node)) return false;
  }
  return true;
}

// Caminhos de todos os tabuleiros de profundidade 1 jogáveis sob um prefixo.
export function playableLeafBoards(
  board: Board,
  tiebreak: Tiebreak,
  prefix: Path = [],
  actionCount = Infinity,
  blockedFor?: Player,
): Path[] {
  const node = getNode(board, prefix);
  if (
    !isBoard(node) ||
    resultOf(node, tiebreak) !== null ||
    isLocked(node, actionCount) ||
    isProtectedAgainst(node, actionCount, blockedFor)
  ) {
    return [];
  }
  if (node.depth === 1) return [prefix];
  const paths: Path[] = [];
  for (let i = 0; i < 9; i++) {
    paths.push(...playableLeafBoards(board, tiebreak, [...prefix, i], actionCount, blockedFor));
  }
  return paths;
}

export function cloneBoard(board: Board): Board {
  return {
    depth: board.depth,
    cells: board.cells.map((cell) => (isBoard(cell) ? cloneBoard(cell) : cell)),
  };
}
