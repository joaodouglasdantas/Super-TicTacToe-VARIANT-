import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createBoard,
  createGame,
  getNode,
  winningLines,
  type Board,
  type GameConfig,
  type Result,
} from '../../src/engine';
import { X_WINS_TOP_ROW } from './fixtures';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
  map: 'galaxy',
};

function subWith(cells: (Result | null)[]): Board {
  const board = createBoard(1);
  board.cells = cells.map((c) => (c === 'X' || c === 'O' ? c : null));
  return board;
}

describe('linhas vencedoras (REQ-RISCO-07)', () => {
  it('devolve a linha fechada num tabuleiro simples', () => {
    const board = subWith(['X', 'X', 'X', null, null, null, null, null, null]);
    expect(winningLines(board, 'majority')).toEqual([[0, 1, 2]]);
  });

  it('devolve a diagonal (AC-RISCO-03)', () => {
    const board = subWith(['X', null, null, null, 'X', null, null, null, 'X']);
    expect(winningLines(board, 'majority')).toEqual([[0, 4, 8]]);
  });

  it('devolve as duas linhas quando uma jogada fecha duas (AC-RISCO-04)', () => {
    // X em 0,1,2 e 0,4,8: a casa 0 fecha linha e diagonal.
    const board = subWith(['X', 'X', 'X', null, 'X', null, null, null, 'X']);
    expect(winningLines(board, 'majority')).toEqual([
      [0, 1, 2],
      [0, 4, 8],
    ]);
  });

  it('tabuleiro sem vencedor não tem linha', () => {
    expect(winningLines(subWith([null, null, null, null, null, null, null, null, null]), 'majority')).toEqual([]);
    const drawn = subWith(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']);
    expect(winningLines(drawn, 'majority')).toEqual([]);
  });

  it('vitória por maioria no tabuleiro grande não gera linha (RN-RISCO-01, AC-RISCO-05)', () => {
    const grid: Result[] = ['X', 'O', 'X', 'O', 'draw', 'X', 'O', 'X', 'draw'];
    const big: Board = {
      depth: 2,
      cells: grid.map((r) => {
        const sub = createBoard(1);
        if (r === 'X' || r === 'O') sub.cells[0] = sub.cells[1] = sub.cells[2] = r;
        else if (r === 'draw') sub.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
        return sub;
      }),
    };
    expect(winningLines(big, 'majority')).toEqual([]);
  });

  it('variante conta pros dois risca através do tabuleiro empatado (RN-RISCO-02)', () => {
    const grid: Result[] = ['X', null, null, null, 'X', null, null, null, 'draw'];
    const big: Board = {
      depth: 2,
      cells: grid.map((r) => {
        const sub = createBoard(1);
        if (r === 'X' || r === 'O') sub.cells[0] = sub.cells[1] = sub.cells[2] = r;
        else if (r === 'draw') sub.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
        return sub;
      }),
    };
    expect(winningLines(big, 'both')).toEqual([[0, 4, 8]]);
    expect(winningLines(big, 'neutral')).toEqual([]);
  });
});

describe('linhas durante uma partida real', () => {
  it('aparecem no tabuleiro conquistado e no grande ao fim (AC-RISCO-01, 02)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    // X fechou 6,7,8 no tabuleiro 0.
    expect(winningLines(getNode(state.board, [0]) as Board, 'majority')).toEqual([[6, 7, 8]]);
    expect(winningLines(state.board, 'majority')).toEqual([]);

    for (const move of X_WINS_TOP_ROW.slice(5)) state = applyMove(state, move);
    expect(state.result).toBe('X');
    expect(winningLines(state.board, 'majority')).toEqual([[0, 1, 2]]);
  });

  it('desfazer remove a linha (RN-RISCO-03, AC-RISCO-06)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    const sub = () => winningLines(getNode(state.board, [0]) as Board, 'majority');
    expect(sub()).toHaveLength(1);
    state = { ...state };
    const undone = X_WINS_TOP_ROW.slice(0, 4);
    let rebuilt = createGame(classic);
    for (const move of undone) rebuilt = applyMove(rebuilt, move);
    expect(winningLines(getNode(rebuilt.board, [0]) as Board, 'majority')).toEqual([]);
  });

  it('a variante de limpeza preserva a linha do conquistado (RN-RISCO-04, AC-RISCO-09)', () => {
    let state = createGame({ ...classic, clearVariant: true });
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(winningLines(getNode(state.board, [0]) as Board, 'majority')).toEqual([[6, 7, 8]]);
  });
});
