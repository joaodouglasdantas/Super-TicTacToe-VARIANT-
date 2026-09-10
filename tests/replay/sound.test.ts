import { describe, expect, it } from 'vitest';
import { soundsForTransition } from '../../src/audio/events';
import { applyMove, createGame, undo, type GameConfig } from '../../src/engine';
import { X_WINS_TOP_ROW } from '../engine/fixtures';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
  map: 'galaxy',
};

describe('sons de uma jogada (spec SOM)', () => {
  it('jogada comum toca só a marca de quem jogou (REQ-SOM-01, 02)', () => {
    const before = createGame(classic);
    const after = applyMove(before, [4, 4]);
    expect(soundsForTransition(before, after)).toEqual({ mark: 'X', strikes: [] });
  });

  it('marca do adversário também soa (REQ-SOM-05)', () => {
    let before = applyMove(createGame(classic), [4, 4]);
    const after = applyMove(before, [4, 0]);
    expect(soundsForTransition(before, after).mark).toBe('O');
    before = after;
  });

  it('fechar um tabuleiro toca marca e risco pequeno (REQ-SOM-09)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 4)) state = applyMove(state, move);
    const after = applyMove(state, X_WINS_TOP_ROW[4]);
    expect(soundsForTransition(state, after)).toEqual({ mark: 'X', strikes: ['small'] });
  });

  it('fechar a partida toca marca, risco pequeno e risco grande (REQ-SOM-10)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, -1)) state = applyMove(state, move);
    const after = applyMove(state, X_WINS_TOP_ROW.at(-1)!);
    const sounds = soundsForTransition(state, after);
    expect(sounds.mark).toBe('X');
    expect(sounds.strikes).toEqual(['small', 'big']);
  });

  it('desfazer é silencioso (RN-SOM-05, AC-SOM-07)', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]);
    const undone = undo(state);
    expect(soundsForTransition(state, undone)).toEqual({ mark: null, strikes: [] });
  });

  it('estado igual não produz som', () => {
    const state = applyMove(createGame(classic), [4, 4]);
    expect(soundsForTransition(state, state)).toEqual({ mark: null, strikes: [] });
  });
});
