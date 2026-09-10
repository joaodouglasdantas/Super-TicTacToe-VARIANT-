import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  replay,
  serialize,
  undo,
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

describe('configuração imutável (REQ-STT-03, RN-STT-08)', () => {
  it('a configuração do estado é congelada na criação', () => {
    const state = createGame(classic);
    expect(Object.isFrozen(state.config)).toBe(true);
  });

  it('quem começa segue a configuração (RN-STT-06)', () => {
    expect(createGame({ ...classic, startingPlayer: 'O' }).currentPlayer).toBe('O');
  });
});

describe('desfazer (REQ-STT-07, AC-STT-08 na parte do motor)', () => {
  it('desfazer uma jogada devolve a vez e o tabuleiro anteriores', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 0]);
    const snapshot = JSON.stringify(serialize(state));
    state = applyMove(state, [0, 4]);
    state = undo(state);
    expect(JSON.stringify(serialize(state))).toBe(snapshot);
    expect(state.currentPlayer).toBe('O');
  });

  it('desfazer N jogadas de uma vez devolve a vez ao mesmo jogador', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 0]);
    state = applyMove(state, [0, 4]);
    state = undo(state, 2);
    expect(state.moves).toHaveLength(0);
    expect(state.currentPlayer).toBe('X');
  });

  it('desfazer reconstrói corretamente mesmo com a variante de limpeza', () => {
    let state = createGame({ ...classic, clearVariant: true });
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    const cleared = undo(state); // desfaz a conquista que limpou os tabuleiros
    expect(JSON.stringify(cleared.board)).toBe(
      JSON.stringify(
        replay({
          config: { ...classic, clearVariant: true },
          moves: state.moves.slice(0, 4),
        }).board,
      ),
    );
  });

  it('desfazer sem jogadas é inofensivo', () => {
    const state = undo(createGame(classic));
    expect(state.moves).toHaveLength(0);
  });
});

describe('serialização e retomada (REQ-STT-14)', () => {
  it('serializar e reidratar reproduz o mesmo estado', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 9)) state = applyMove(state, move);
    const restored = replay(serialize(state));
    expect(JSON.stringify(restored.board)).toBe(JSON.stringify(state.board));
    expect(restored.currentPlayer).toBe(state.currentPlayer);
    expect(restored.forcedPath).toEqual(state.forcedPath);
    expect(restored.result).toBe(state.result);
  });

  it('a partida completa sobrevive ao ciclo de serialização', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    expect(replay(serialize(state)).result).toBe('X');
  });
});
