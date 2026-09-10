import { describe, expect, it } from 'vitest';
import {
  allowedBoards,
  applyMove,
  createBoard,
  createGame,
  getNode,
  replay,
  resultOf,
  undo,
  validateMove,
  type Board,
  type GameConfig,
  type Path,
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

// X abre em [0,0], direcionando O pro tabuleiro 0; a partir daí o roteiro
// X_WINS_TOP_ROW inteiro é jogado com os papéis invertidos: O conquista 0, 1 e 2.
const O_WINS_TOP_ROW: Path[] = [[0, 0], ...X_WINS_TOP_ROW];

describe('vitória de O e alternância de início', () => {
  it('O vence quando começa e reproduz o roteiro da linha superior', () => {
    let state = createGame({ ...classic, startingPlayer: 'O' });
    state = applyMove(state, X_WINS_TOP_ROW[0]); // O joga como primeiro
    expect(state.moves[0].player).toBe('O');
    for (const move of X_WINS_TOP_ROW.slice(1)) state = applyMove(state, move);
    expect(state.result).toBe('O');
  });

  it('com X começando fora do roteiro, o mesmo caminho dá vitória a O', () => {
    let state = createGame(classic);
    for (const move of O_WINS_TOP_ROW) state = applyMove(state, move);
    expect(state.result).toBe('O');
  });
});

describe('empate de partida inteira em profundidade 1', () => {
  it('tabuleiro simples cheio sem linha termina empatado', () => {
    let state = createGame({ ...classic, depth: 1 });
    // X: 0,1,5,6,8 / O: 2,3,4,7 → sem linha de 3.
    for (const cell of [0, 2, 1, 3, 5, 4, 6, 7, 8]) {
      state = applyMove(state, [cell]);
    }
    expect(state.result).toBe('draw');
  });
});

describe('desempate "conta pros dois" no meio de partida real', () => {
  it('linha com tabuleiro empatado fecha a partida na hora', () => {
    // Monta um estado onde os tabuleiros 0 e 1 são de X e o 2 está empatado;
    // resultOf com "both" precisa dar vitória a X, e com "neutral", seguir aberto.
    const board = createBoard(2);
    const winSub = (b: Board) => {
      b.cells[0] = b.cells[1] = b.cells[2] = 'X';
    };
    winSub(getNode(board, [0]) as Board);
    winSub(getNode(board, [1]) as Board);
    const drawn = getNode(board, [2]) as Board;
    drawn.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(resultOf(board, 'both')).toBe('X');
    expect(resultOf(board, 'neutral')).toBeNull(); // demais tabuleiros seguem abertos
    expect(resultOf(board, 'majority')).toBeNull();
  });
});

describe('interação entre limpeza e direcionamento', () => {
  const config: GameConfig = { ...classic, clearVariant: true };

  it('tabuleiro limpo volta a ser jogável nas células apagadas', () => {
    let state = createGame(config);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    // A conquista do 0 limpou o 6 e o 7; O foi direcionado ao 8.
    expect(getNode(state.board, [6, 0])).toBeNull();
    state = applyMove(state, [8, 6]); // O manda X pro tabuleiro 6, recém limpo
    expect(validateMove(state, [6, 0])).toBeNull(); // célula apagada aceita jogada
    state = applyMove(state, [6, 0]);
    expect(getNode(state.board, [6, 0])).toBe('X');
  });

  it('a partida inteira do roteiro segue válida com limpeza ligada', () => {
    let state = createGame(config);
    // Com limpeza, as marcas de O somem no caminho; as jogadas do roteiro
    // continuam legais porque caem em células vazias de tabuleiros abertos.
    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    expect(state.result).toBe('X');
  });
});

describe('robustez do desfazer e da reidratação', () => {
  it('desfazer mais jogadas do que existem volta ao início sem erro', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]);
    state = undo(state, 10);
    expect(state.moves).toHaveLength(0);
    expect(state.currentPlayer).toBe('X');
    expect(allowedBoards(state)).toHaveLength(9);
  });

  it('desfazer e rejogar diferente produz estados independentes', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]);
    state = applyMove(state, [4, 0]);
    const back = undo(state);
    const alt = applyMove(back, [4, 8]);
    expect(getNode(state.board, [4, 0])).toBe('O');
    expect(getNode(alt.board, [4, 0])).toBeNull();
    expect(getNode(alt.board, [4, 8])).toBe('O');
  });

  it('replay rejeita sequência salva corrompida (jogada ilegal)', () => {
    expect(() =>
      replay({ config: classic, moves: [{ player: 'X', path: [4, 4] }, { player: 'O', path: [0, 0] }] }),
    ).toThrow();
  });

  it('replay rejeita caminho fora da profundidade', () => {
    expect(() =>
      replay({ config: classic, moves: [{ player: 'X', path: [4] }] }),
    ).toThrow();
  });
});

describe('resultado por maioria no limite', () => {
  it('5 a 4 decide pra quem tem mais tabuleiros', () => {
    const grid: Result[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    // X em 0,2,3,7,8 (5), O em 1,4,5,6 (4); sem linha de 3 iguais.
    const board = createBoard(2);
    grid.forEach((r, i) => {
      const sub = board.cells[i] as Board;
      if (r === 'X' || r === 'O') sub.cells[0] = sub.cells[1] = sub.cells[2] = r;
    });
    expect(resultOf(board, 'majority')).toBe('X');
    expect(resultOf(board, 'neutral')).toBe('draw');
  });
});
