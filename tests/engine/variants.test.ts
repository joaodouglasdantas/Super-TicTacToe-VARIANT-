import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createBoard,
  createGame,
  getNode,
  resultOf,
  type Board,
  type GameConfig,
  type Result,
  type Tiebreak,
} from '../../src/engine';
import { X_WINS_TOP_ROW } from './fixtures';

// Monta um subtabuleiro de profundidade 1 já decidido (ou vazio).
function makeSub(result: Result): Board {
  const sub = createBoard(1);
  if (result === 'X' || result === 'O') {
    sub.cells[0] = sub.cells[1] = sub.cells[2] = result;
  } else if (result === 'draw') {
    // Cheio, sem linha.
    sub.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  }
  return sub;
}

function makeBig(results: Result[]): Board {
  return { depth: 2, cells: results.map(makeSub) };
}

describe('critérios de desempate (RN-STT-05, AC-STT-05)', () => {
  // Grade de resultados sem linha estrita: X em 0,2,5,7 (4), O em 1,3,6 (3),
  // empates em 4,8. A coluna 2,5,8 é X,X,empate.
  const grid: Result[] = ['X', 'O', 'X', 'O', 'draw', 'X', 'O', 'X', 'draw'];

  it('maioria vence: X leva por 4 tabuleiros a 3 (padrão)', () => {
    expect(resultOf(makeBig(grid), 'majority')).toBe('X');
  });

  it('neutro: sem linha estrita, a partida empata', () => {
    expect(resultOf(makeBig(grid), 'neutral')).toBe('draw');
  });

  it('conta pros dois: empatado completa a linha X,X,empate', () => {
    expect(resultOf(makeBig(grid), 'both')).toBe('X');
  });

  it('maioria empatada em quantidade é empate real', () => {
    const even: Result[] = ['X', 'O', 'X', 'O', 'draw', 'O', 'O', 'X', 'X'];
    // X em 0,2,7,8 (4), O em 1,3,5,6 (4). Sem linha estrita nem via empate.
    expect(resultOf(makeBig(even), 'majority')).toBe('draw');
  });

  it('o desempate não decide enquanto houver tabuleiro em aberto', () => {
    const open: Result[] = ['X', 'X', null, 'O', 'O', 'X', 'draw', 'X', 'O'];
    for (const tiebreak of ['majority', 'neutral', 'both'] as Tiebreak[]) {
      expect(resultOf(makeBig(open), tiebreak)).toBeNull();
    }
  });
});

describe('variante de limpeza (RN-STT-04, AC-STT-06)', () => {
  const config: GameConfig = {
    depth: 2,
    clearVariant: true,
    tiebreak: 'majority',
    startingPlayer: 'X',
    map: 'galaxy',
  };

  it('conquistar um tabuleiro limpa os não decididos e preserva os decididos', () => {
    let state = createGame(config);
    // Jogadas 1-4 do roteiro: O marca nos tabuleiros 6 e 7; X marca 6 e 7 no tabuleiro 0.
    for (const move of X_WINS_TOP_ROW.slice(0, 4)) state = applyMove(state, move);
    expect(getNode(state.board, [6, 0])).toBe('O');
    expect(getNode(state.board, [7, 0])).toBe('O');

    // Jogada 5: X fecha 6,7,8 e conquista o tabuleiro 0.
    state = applyMove(state, X_WINS_TOP_ROW[4]);

    // Tabuleiro 0 decidido e intacto.
    const sub0 = getNode(state.board, [0]) as Board;
    expect(resultOf(sub0, 'majority')).toBe('X');
    expect(getNode(state.board, [0, 6])).toBe('X');

    // Tabuleiros não decididos foram limpos.
    expect(getNode(state.board, [6, 0])).toBeNull();
    expect(getNode(state.board, [7, 0])).toBeNull();
  });

  it('desligada, as jogadas dos outros tabuleiros permanecem', () => {
    let state = createGame({ ...config, clearVariant: false });
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(getNode(state.board, [6, 0])).toBe('O');
    expect(getNode(state.board, [7, 0])).toBe('O');
  });
});
