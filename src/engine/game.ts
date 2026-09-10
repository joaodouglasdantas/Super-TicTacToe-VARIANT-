import {
  cloneBoard,
  createBoard,
  getNode,
  isBoard,
  isLocked,
  playableLeafBoards,
  resultOf,
} from './board';
import { cardMap, drawCard } from './cards';
import type {
  Board,
  CardId,
  GameConfig,
  GameState,
  Hands,
  Move,
  Path,
  Player,
  Result,
  SerializedGame,
  Tiebreak,
} from './types';

export function otherPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

export function createGame(config: GameConfig): GameState {
  if (config.depth < 1) throw new Error('profundidade mínima é 1');
  return {
    config: Object.freeze({ ...config }), // RN-STT-08
    board: createBoard(config.depth),
    currentPlayer: config.startingPlayer, // RN-STT-06
    moves: [],
    forcedPath: null,
    result: null,
    hands: { X: [], O: [] },
    actionCount: 0,
  };
}

// Tabuleiros de profundidade 1 onde o jogador da vez pode jogar (REQ-STT-12).
// RN-CARTAS-02: tabuleiro bloqueado conta como indisponível, igual a decidido.
export function allowedBoards(state: GameState): Path[] {
  if (state.result !== null) return [];
  const { tiebreak } = state.config;
  if (state.forcedPath !== null) {
    const target = playableLeafBoards(state.board, tiebreak, state.forcedPath, state.actionCount);
    if (target.length > 0) return target;
  }
  return playableLeafBoards(state.board, tiebreak, [], state.actionCount); // RN-STT-02
}

function startsWith(path: Path, prefix: Path): boolean {
  return prefix.every((index, i) => path[i] === index);
}

// Todas as jogadas legais do jogador da vez (não inclui jogadas de carta).
export function legalMoves(state: GameState): Path[] {
  const moves: Path[] = [];
  for (const boardPath of allowedBoards(state)) {
    for (let cell = 0; cell < 9; cell++) {
      const path = [...boardPath, cell];
      if (getNode(state.board, path) === null) moves.push(path);
    }
  }
  return moves;
}

export type MoveError =
  | 'partida-encerrada'
  | 'caminho-invalido'
  | 'celula-ocupada'
  | 'tabuleiro-nao-permitido';

export function validateMove(state: GameState, path: Path): MoveError | null {
  if (state.result !== null) return 'partida-encerrada';
  if (path.length !== state.config.depth || path.some((i) => i < 0 || i > 8)) {
    return 'caminho-invalido';
  }
  const boardPath = path.slice(0, -1);
  const allowed = allowedBoards(state);
  if (!allowed.some((p) => startsWith(boardPath, p) && p.length === boardPath.length)) {
    return 'tabuleiro-nao-permitido';
  }
  const cell = getNode(state.board, path);
  if (cell !== null) return 'celula-ocupada';
  return null;
}

// RN-STT-04: ao conquistar um tabuleiro, limpa as jogadas dos tabuleiros irmãos
// não decididos (recursivamente). Tabuleiros decididos permanecem.
function clearUndecided(board: Board, tiebreak: Tiebreak): void {
  for (let i = 0; i < 9; i++) {
    const cell = board.cells[i];
    if (isBoard(cell)) {
      if (resultOf(cell, tiebreak) === null) clearUndecided(cell, tiebreak);
    } else {
      board.cells[i] = null;
    }
  }
}

// RN-STT-04, aplicado a um caminho arbitrário (jogada normal ou uma das duas
// marcas da "estrela da sorte"): varre os ancestrais do mais fundo pro topo,
// limpando os irmãos ainda abertos de qualquer um que tenha acabado de fechar.
function applyClearVariant(board: Board, before: Board, path: Path, tiebreak: Tiebreak): void {
  for (let level = path.length - 1; level >= 1; level--) {
    const ancestorPath = path.slice(0, level);
    const ancestor = getNode(board, ancestorPath) as Board;
    const beforeAncestor = getNode(before, ancestorPath) as Board;
    const nowWon = resultOf(ancestor, tiebreak) === 'X' || resultOf(ancestor, tiebreak) === 'O';
    if (nowWon && resultOf(beforeAncestor, tiebreak) === null) {
      const parent = getNode(board, path.slice(0, level - 1)) as Board;
      const wonIndex = ancestorPath[level - 1];
      for (let i = 0; i < 9; i++) {
        if (i === wonIndex) continue;
        const sibling = parent.cells[i];
        if (isBoard(sibling) && resultOf(sibling, tiebreak) === null) {
          clearUndecided(sibling, tiebreak);
        }
      }
    }
  }
}

// spec CARTAS (REQ-CARTAS-02, 03): vencer um tabuleiro pequeno (profundidade
// 1, com X ou O — nunca empate) concede uma carta sorteada do baralho do
// mapa. Só placements (jogada normal, salto-estelar, estrela-da-sorte) podem
// conceder — efeitos de carta (apagar, mover, bloquear...) nunca concedem,
// mesmo que fechem um tabuleiro como efeito colateral (ex: correnteza).
function grantIfNewlyWon(
  hands: Hands,
  beforeRoot: Board,
  afterRoot: Board,
  boardPath: Path,
  tiebreak: Tiebreak,
  depth: number,
  map: GameConfig['map'],
  seed: number,
): Hands {
  if (depth <= 1 || boardPath.length !== depth - 1) return hands; // sem noção de "tabuleiro pequeno" com profundidade 1
  const before = getNode(beforeRoot, boardPath);
  const after = getNode(afterRoot, boardPath);
  if (!isBoard(before) || !isBoard(after)) return hands;
  if (resultOf(before, tiebreak) !== null) return hands; // já estava decidido
  const result = resultOf(after, tiebreak);
  if (result !== 'X' && result !== 'O') return hands; // não fechou, ou fechou empatado
  const winner = result;
  if (hands[winner].length >= 3) return hands; // REQ-CARTAS-05: mão cheia, perde a carta
  const card = drawCard(map, seed);
  return { ...hands, [winner]: [...hands[winner], card] };
}

// Aplica a jogada e devolve o novo estado (REQ-STT-02: jogada inválida não altera nada).
export function applyMove(state: GameState, path: Path): GameState {
  const error = validateMove(state, path);
  if (error) throw new Error(`jogada inválida (${error}): [${path}]`);

  const { tiebreak, depth, map } = state.config;
  const board = cloneBoard(state.board);

  // Marca a célula.
  const leafBoard = getNode(board, path.slice(0, -1)) as Board;
  leafBoard.cells[path[path.length - 1]] = state.currentPlayer;

  if (state.config.clearVariant) applyClearVariant(board, state.board, path, tiebreak);

  const result: Result = resultOf(board, tiebreak);

  // RN-STT-01: a posição da célula direciona o próximo jogador.
  // Generalização pra profundidade N: o prefixo obrigatório é o caminho da
  // jogada sem o primeiro índice (na profundidade 2: o índice da célula).
  const forcedPath: Path | null = depth === 1 ? null : path.slice(1);

  const actionCount = state.actionCount + 1;
  const hands = grantIfNewlyWon(
    state.hands,
    state.board,
    board,
    path.slice(0, -1),
    tiebreak,
    depth,
    map,
    state.actionCount,
  );

  return {
    config: state.config,
    board,
    currentPlayer: otherPlayer(state.currentPlayer), // RN-STT-07
    moves: [...state.moves, { player: state.currentPlayer, path }],
    forcedPath: result === null ? forcedPath : null,
    result,
    hands,
    actionCount,
  };
}

// ---- Cartas (spec CARTAS) -------------------------------------------------

export type CardError =
  | 'partida-encerrada'
  | 'fora-de-vez'
  | 'carta-nao-esta-na-mao'
  | 'carta-de-outro-mapa'
  | 'alvo-invalido';

function isProtectedAgainst(board: Board, actionCount: number, attacker: Player): boolean {
  return (
    board.protectedUntilAction !== undefined &&
    actionCount < board.protectedUntilAction &&
    board.protectedBy !== undefined &&
    board.protectedBy !== attacker
  );
}

// RN-CARTAS-01: só mira tabuleiro pequeno ainda aberto (nunca decidido).
// RN-CARTAS-02: nem bloqueado. RN-CARTAS-03: nem protegido contra quem joga.
function boardTargetable(board: Board | Player | null, tiebreak: Tiebreak, actionCount: number, player: Player): board is Board {
  if (!isBoard(board)) return false;
  if (resultOf(board, tiebreak) !== null) return false;
  if (isLocked(board, actionCount)) return false;
  if (isProtectedAgainst(board, actionCount, player)) return false;
  return true;
}

export function validateCard(state: GameState, move: Move): CardError | null {
  if (state.result !== null) return 'partida-encerrada';
  if (move.player !== state.currentPlayer) return 'fora-de-vez';
  const card = move.card;
  if (!card) return 'alvo-invalido';
  if (!state.hands[move.player].includes(card)) return 'carta-nao-esta-na-mao';
  if (cardMap(card) !== state.config.map) return 'carta-de-outro-mapa';

  const { tiebreak, depth } = state.config;
  const actionCount = state.actionCount;
  const board = state.board;

  switch (card) {
    case 'salto-estelar': {
      if (move.path.length !== depth) return 'alvo-invalido';
      const boardNode = getNode(board, move.path.slice(0, -1));
      if (!isBoard(boardNode) || resultOf(boardNode, tiebreak) !== null) return 'alvo-invalido';
      if (isLocked(boardNode, actionCount)) return 'alvo-invalido';
      if (getNode(board, move.path) !== null) return 'alvo-invalido';
      return null;
    }
    case 'buraco-negro': {
      if (move.path.length !== depth) return 'alvo-invalido';
      const boardNode = getNode(board, move.path.slice(0, -1));
      if (!boardTargetable(boardNode, tiebreak, actionCount, move.player)) return 'alvo-invalido';
      const cell = getNode(board, move.path);
      if (cell !== otherPlayer(move.player)) return 'alvo-invalido'; // só marca do adversário
      return null;
    }
    case 'estrela-da-sorte': {
      if (
        move.path.length !== depth - 1 ||
        !move.path2 ||
        move.path2.length !== depth - 1 ||
        move.cellIndex === undefined
      ) {
        return 'alvo-invalido';
      }
      const a = getNode(board, move.path);
      const b = getNode(board, move.path2);
      if (!boardTargetable(a, tiebreak, actionCount, move.player)) return 'alvo-invalido';
      if (!boardTargetable(b, tiebreak, actionCount, move.player)) return 'alvo-invalido';
      if (a.cells[move.cellIndex] !== null || b.cells[move.cellIndex] !== null) return 'alvo-invalido';
      return null;
    }
    case 'devorador-de-tabuleiro':
    case 'bolha-protecao':
    case 'tempestade':
    case 'tsunami': {
      if (move.path.length !== depth - 1) return 'alvo-invalido';
      const boardNode = getNode(board, move.path);
      if (!boardTargetable(boardNode, tiebreak, actionCount, move.player)) return 'alvo-invalido';
      return null;
    }
    case 'correnteza': {
      if (move.path.length !== depth || !move.path2 || move.path2.length !== depth) {
        return 'alvo-invalido';
      }
      const boardPath = move.path.slice(0, -1);
      if (!startsWith(move.path2, boardPath) || move.path2.length !== boardPath.length + 1) {
        return 'alvo-invalido'; // precisa ser a mesma tabuleiro (RN: dentro do mesmo tabuleiro aberto)
      }
      const boardNode = getNode(board, boardPath);
      if (!boardTargetable(boardNode, tiebreak, actionCount, move.player)) return 'alvo-invalido';
      if (getNode(board, move.path) !== move.player) return 'alvo-invalido'; // só marca própria
      if (getNode(board, move.path2) !== null) return 'alvo-invalido';
      return null;
    }
    default:
      return 'alvo-invalido';
  }
}

function withoutOneCard(hand: CardId[], card: CardId): CardId[] {
  const i = hand.indexOf(card);
  if (i === -1) return hand;
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

// Aplica a jogada de uma carta (REQ-CARTAS-06: consome a vez, nunca marca
// junto com uma jogada normal no mesmo turno). Efeitos de carta nunca
// concedem carta nova, mesmo os que fecham um tabuleiro como efeito
// colateral (ex: correnteza completando uma linha) — só placement concede.
export function applyCard(state: GameState, move: Move): GameState {
  const error = validateCard(state, move);
  if (error) throw new Error(`carta inválida (${error}): ${move.card}`);
  const card = move.card as CardId;
  const { tiebreak, depth } = state.config;
  const board = cloneBoard(state.board);
  const actionCount = state.actionCount + 1;
  const hands: Hands = {
    ...state.hands,
    [move.player]: withoutOneCard(state.hands[move.player], card),
  };
  let forcedPath: Path | null = null; // padrão: carta de efeito devolve escolha livre

  switch (card) {
    case 'salto-estelar': {
      const leaf = getNode(board, move.path.slice(0, -1)) as Board;
      leaf.cells[move.path[move.path.length - 1]] = move.player;
      if (state.config.clearVariant) applyClearVariant(board, state.board, move.path, tiebreak);
      forcedPath = depth === 1 ? null : move.path.slice(1);
      break;
    }
    case 'buraco-negro': {
      const leaf = getNode(board, move.path.slice(0, -1)) as Board;
      leaf.cells[move.path[move.path.length - 1]] = null;
      break;
    }
    case 'estrela-da-sorte': {
      const boardA = getNode(board, move.path) as Board;
      const boardB = getNode(board, move.path2!) as Board;
      boardA.cells[move.cellIndex!] = move.player;
      boardB.cells[move.cellIndex!] = move.player;
      if (state.config.clearVariant) {
        applyClearVariant(board, state.board, [...move.path, move.cellIndex!], tiebreak);
        applyClearVariant(board, state.board, [...move.path2!, move.cellIndex!], tiebreak);
      }
      forcedPath = depth === 1 ? null : [move.cellIndex!];
      break;
    }
    case 'devorador-de-tabuleiro': {
      const target = getNode(board, move.path) as Board;
      target.lockedUntilAction = actionCount + 3;
      break;
    }
    case 'bolha-protecao': {
      const target = getNode(board, move.path) as Board;
      target.protectedUntilAction = actionCount + 3;
      target.protectedBy = move.player;
      break;
    }
    case 'tempestade': {
      forcedPath = move.path;
      break;
    }
    case 'tsunami': {
      const target = getNode(board, move.path) as Board;
      target.cells = target.cells.map(() => null);
      break;
    }
    case 'correnteza': {
      const boardNode = getNode(board, move.path.slice(0, -1)) as Board;
      boardNode.cells[move.path[move.path.length - 1]] = null;
      boardNode.cells[move.path2![move.path2!.length - 1]] = move.player;
      break;
    }
    default:
      throw new Error(`carta desconhecida: ${card}`);
  }

  const result: Result = resultOf(board, tiebreak);

  return {
    config: state.config,
    board,
    currentPlayer: otherPlayer(state.currentPlayer),
    moves: [...state.moves, { ...move }],
    forcedPath: result === null ? forcedPath : null,
    result,
    hands,
    actionCount,
  };
}

// Ponto de entrada único pra replay/undo/sincronização p2p: uma entrada do
// histórico é uma jogada normal ou uma jogada de carta, sem o chamador
// precisar saber qual (spec CARTAS, Notas Técnicas).
export function applyAction(state: GameState, move: Move): GameState {
  return move.card ? applyCard(state, move) : applyMove(state, move.path);
}

// REQ-STT-07: desfaz as últimas `count` jogadas reconstruindo por replay
// (determinístico mesmo com a variante de limpeza, e com cartas — a mão
// reaparece/desaparece sozinha porque é sempre recomputada do zero).
export function undo(state: GameState, count = 1): GameState {
  const moves = state.moves.slice(0, Math.max(0, state.moves.length - count));
  return replay({ config: { ...state.config }, moves });
}

export function serialize(state: GameState): SerializedGame {
  return { config: { ...state.config }, moves: state.moves.map((m) => ({ ...m })) };
}

export function replay(saved: SerializedGame): GameState {
  let state = createGame(saved.config);
  for (const move of saved.moves) {
    state = applyAction(state, move);
  }
  return state;
}
