import { describe, expect, it } from 'vitest';
import {
  allowedBoards,
  applyMove,
  createGame,
  validateMove,
  type GameConfig,
} from '../../src/engine';
import { X_WINS_TOP_ROW } from './fixtures';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
  map: 'galaxy',
};

describe('jogada direcionada (RN-STT-01, AC-STT-01)', () => {
  it('a célula jogada determina o tabuleiro do adversário', () => {
    // Dado que é a vez de X; quando X joga na célula 0 do tabuleiro 4,
    // então O só pode jogar no tabuleiro 0.
    let state = createGame(classic);
    state = applyMove(state, [4, 0]);
    expect(state.currentPlayer).toBe('O');
    expect(allowedBoards(state)).toEqual([[0]]);
  });
});

describe('jogada inválida rejeitada (REQ-STT-02, RN-STT-07, AC-STT-02)', () => {
  it('rejeita jogar fora do tabuleiro obrigatório sem alterar o estado', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]); // O obrigado ao tabuleiro 4
    const before = JSON.stringify(state);
    expect(validateMove(state, [0, 0])).toBe('tabuleiro-nao-permitido');
    expect(() => applyMove(state, [0, 0])).toThrow();
    expect(JSON.stringify(state)).toBe(before);
    expect(state.currentPlayer).toBe('O');
  });

  it('rejeita célula ocupada', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]);
    expect(validateMove(state, [4, 4])).toBe('celula-ocupada');
  });

  it('rejeita caminho malformado', () => {
    const state = createGame(classic);
    expect(validateMove(state, [4])).toBe('caminho-invalido');
    expect(validateMove(state, [4, 9])).toBe('caminho-invalido');
  });

  it('rejeita qualquer jogada com a partida encerrada', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    expect(state.result).toBe('X');
    expect(validateMove(state, [8, 0])).toBe('partida-encerrada');
    expect(allowedBoards(state)).toEqual([]);
  });
});

describe('destino decidido libera escolha (RN-STT-02, AC-STT-03)', () => {
  it('quando o destino está conquistado, joga-se em qualquer tabuleiro aberto', () => {
    let state = createGame(classic);
    // Primeiras 5 jogadas do roteiro: X conquista o tabuleiro 0.
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    // O foi direcionado ao 8; joga a célula 0, direcionando X ao tabuleiro 0, decidido.
    state = applyMove(state, [8, 0]);
    const allowed = allowedBoards(state);
    expect(allowed).not.toContainEqual([0]);
    expect(allowed).toHaveLength(8); // todos os demais seguem abertos
  });
});

describe('vitória no tabuleiro grande (RN-STT-03, AC-STT-04)', () => {
  it('conquistar três tabuleiros em linha encerra a partida com vitória', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    expect(state.result).toBe('X');
    expect(state.moves).toHaveLength(X_WINS_TOP_ROW.length);
  });

  it('a partida segue aberta enquanto não há linha no grande', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, -1)) state = applyMove(state, move);
    expect(state.result).toBeNull();
  });
});

describe('motor genérico em profundidade 3 (REQ-STT-01)', () => {
  it('direciona pelo sufixo do caminho e aceita jogada válida', () => {
    let state = createGame({ ...classic, depth: 3 });
    state = applyMove(state, [0, 1, 2]);
    expect(allowedBoards(state)).toEqual([[1, 2]]);
    state = applyMove(state, [1, 2, 5]);
    expect(state.moves).toHaveLength(2);
    expect(allowedBoards(state)).toEqual([[2, 5]]);
  });

  it('profundidade 1 é o jogo da velha simples, sem direcionamento', () => {
    let state = createGame({ ...classic, depth: 1 });
    state = applyMove(state, [0]);
    state = applyMove(state, [4]);
    state = applyMove(state, [1]);
    state = applyMove(state, [5]);
    state = applyMove(state, [2]); // X fecha 0,1,2
    expect(state.result).toBe('X');
  });
});
