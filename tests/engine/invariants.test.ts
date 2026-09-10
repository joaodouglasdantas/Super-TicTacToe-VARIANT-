import { describe, expect, it } from 'vitest';
import {
  allowedBoards,
  applyMove,
  createGame,
  getNode,
  otherPlayer,
  replay,
  serialize,
  validateMove,
  type GameConfig,
  type GameState,
  type Path,
  type Player,
  type Tiebreak,
} from '../../src/engine';

// PRNG com semente fixa (mulberry32): partidas aleatórias porém reprodutíveis.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function legalMoves(state: GameState): Path[] {
  const moves: Path[] = [];
  for (const boardPath of allowedBoards(state)) {
    for (let cell = 0; cell < 9; cell++) {
      const path = [...boardPath, cell];
      if (getNode(state.board, path) === null) moves.push(path);
    }
  }
  return moves;
}

// Joga uma partida inteira com jogadas aleatórias, checando invariantes a cada lance.
function playRandomGame(config: GameConfig, seed: number): GameState {
  const rand = mulberry32(seed);
  let state = createGame(config);
  let expected: Player = config.startingPlayer;
  // Limite folgado: células + reaberturas por limpeza (finitas: cada conquista é permanente).
  const cap = 9 ** config.depth * 12;
  let turns = 0;

  while (state.result === null) {
    turns++;
    expect(turns, 'a partida deve terminar').toBeLessThanOrEqual(cap);

    // Invariante: partida aberta sempre tem jogada legal.
    const moves = legalMoves(state);
    expect(moves.length, 'partida aberta sem jogada legal').toBeGreaterThan(0);

    // Invariante: alternância de turno (RN-STT-07).
    expect(state.currentPlayer).toBe(expected);

    const move = moves[Math.floor(rand() * moves.length)];
    expect(validateMove(state, move)).toBeNull();
    state = applyMove(state, move);
    expected = otherPlayer(expected);
  }

  // Invariantes de encerramento.
  expect(['X', 'O', 'draw']).toContain(state.result);
  expect(legalMoves(state)).toHaveLength(0);

  // Invariante: serializar e reidratar reproduz tabuleiro e resultado (REQ-STT-14).
  const restored = replay(serialize(state));
  expect(JSON.stringify(restored.board)).toBe(JSON.stringify(state.board));
  expect(restored.result).toBe(state.result);

  return state;
}

const tiebreaks: Tiebreak[] = ['majority', 'neutral', 'both'];

describe('invariantes em partidas aleatórias (motor completo)', () => {
  for (const depth of [1, 2]) {
    for (const tiebreak of tiebreaks) {
      for (const clearVariant of [false, true]) {
        const label = `profundidade ${depth}, desempate ${tiebreak}, limpeza ${clearVariant ? 'ligada' : 'desligada'}`;
        it(`${label}: 25 partidas válidas do início ao fim`, () => {
          for (let seed = 1; seed <= 25; seed++) {
            playRandomGame(
              { depth, tiebreak, clearVariant, startingPlayer: seed % 2 ? 'X' : 'O', map: 'galaxy' },
              seed,
            );
          }
        });
      }
    }
  }

  it('profundidade 3: partidas aleatórias mantêm os invariantes', () => {
    for (const tiebreak of tiebreaks) {
      playRandomGame(
        { depth: 3, tiebreak, clearVariant: false, startingPlayer: 'X', map: 'galaxy' },
        42,
      );
    }
  });

  it('profundidade 3 com limpeza: termina e permanece válida', () => {
    playRandomGame(
      { depth: 3, tiebreak: 'majority', clearVariant: true, startingPlayer: 'O', map: 'galaxy' },
      7,
    );
  });

  it('todo resultado possível aparece no conjunto de partidas (sanidade da amostra)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const state = playRandomGame(
        { depth: 1, tiebreak: 'majority', clearVariant: false, startingPlayer: 'X', map: 'galaxy' },
        seed,
      );
      seen.add(state.result as string);
    }
    expect(seen).toContain('X');
    expect(seen).toContain('O');
    expect(seen).toContain('draw');
  });
});
