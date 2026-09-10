import { beforeEach, describe, expect, it } from 'vitest';
import { replay, type GameConfig } from '../../src/engine';
import { exportEntry, MAX_IMPORT_BYTES, parseImported } from '../../src/replay/exchange';
import { buildFrames, FINAL_DELAY_MS, FRAME_DELAY_MS } from '../../src/replay/gif';
import {
  addToLibrary,
  LIBRARY_LIMIT,
  listLibrary,
  removeFromLibrary,
  type LibraryEntry,
} from '../../src/replay/library';
import { X_WINS_TOP_ROW } from '../engine/fixtures';

// localStorage em memória pro ambiente node.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
};

function finishedMatch(): Omit<LibraryEntry, 'id' | 'finishedAt'> {
  const moves = X_WINS_TOP_ROW.map((path, i) => ({
    player: (i % 2 === 0 ? 'X' : 'O') as 'X' | 'O',
    path,
  }));
  return {
    mode: 'local',
    names: { X: 'Ana', O: 'Bia' },
    config: classic,
    moves,
    result: 'X',
    map: 'galaxy',
  };
}

describe('biblioteca (REQ-REPLAY-01, 02; RN-REPLAY-04; AC-01, 09)', () => {
  it('adiciona no topo e lista da mais recente pra mais antiga', () => {
    const a = addToLibrary(finishedMatch());
    const b = addToLibrary({ ...finishedMatch(), names: { X: 'Carla', O: 'Dani' } });
    const list = listLibrary();
    expect(list.map((e) => e.id)).toEqual([b.id, a.id]);
    expect(list[0].names.X).toBe('Carla');
  });

  it('remove por id (RN-REPLAY-01 no nível de dados)', () => {
    const entry = addToLibrary(finishedMatch());
    removeFromLibrary(entry.id);
    expect(listLibrary()).toHaveLength(0);
  });

  it('descarta a mais antiga ao passar do limite (AC-REPLAY-09)', () => {
    const first = addToLibrary(finishedMatch());
    for (let i = 0; i < LIBRARY_LIMIT; i++) addToLibrary(finishedMatch());
    const list = listLibrary();
    expect(list).toHaveLength(LIBRARY_LIMIT);
    expect(list.some((e) => e.id === first.id)).toBe(false);
  });

  it('armazenamento indisponível não quebra', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    } as unknown as Storage;
    expect(() => addToLibrary(finishedMatch())).not.toThrow();
    expect(listLibrary()).toEqual([]);
  });
});

describe('exportar e importar (REQ-REPLAY-04, 05; RN-REPLAY-03; AC-05, 06)', () => {
  it('round trip: exportado importa idêntico', () => {
    const entry = addToLibrary(finishedMatch());
    const { text, filename } = exportEntry(entry);
    expect(filename).toMatch(/^super-tictactoe-\d{4}-\d{2}-\d{2}-Ana-vs-Bia\.json$/);
    const parsed = parseImported(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.moves).toEqual(entry.moves);
    expect(parsed!.result).toBe('X');
    expect(parsed!.names).toEqual(entry.names);
  });

  it('rejeita lixo, formato alheio e jogada ilegal', () => {
    expect(parseImported('não é json')).toBeNull();
    expect(parseImported(JSON.stringify({ app: 'outro' }))).toBeNull();
    const adulterated = exportEntry(addToLibrary(finishedMatch())).text.replace(
      '[0,6]',
      '[9,9]',
    );
    expect(parseImported(adulterated)).toBeNull();
  });

  it('rejeita partida não terminada e resultado que não bate', () => {
    const base = finishedMatch();
    const unfinished = { ...base, moves: base.moves.slice(0, 4) };
    const entry = addToLibrary(unfinished as Omit<LibraryEntry, 'id' | 'finishedAt'>);
    expect(parseImported(exportEntry(entry).text)).toBeNull();

    const wrongResult = addToLibrary({ ...finishedMatch(), result: 'O' });
    expect(parseImported(exportEntry(wrongResult).text)).toBeNull();
  });

  it('rejeita arquivo acima do limite de tamanho', () => {
    const big = JSON.stringify({ filler: 'x'.repeat(MAX_IMPORT_BYTES) });
    expect(parseImported(big)).toBeNull();
  });
});

describe('frames do GIF (REQ-REPLAY-06; AC-07)', () => {
  it('gera M + 1 frames, com o final demorado', () => {
    const match = finishedMatch();
    const frames = buildFrames(match);
    expect(frames).toHaveLength(match.moves.length + 1);
    expect(frames.every((f, i) => i === frames.length - 1 || f.delayMs === FRAME_DELAY_MS)).toBe(
      true,
    );
    expect(frames.at(-1)!.delayMs).toBe(FINAL_DELAY_MS);
  });

  it('cada frame é o estado exato após a jogada correspondente', () => {
    const match = finishedMatch();
    const frames = buildFrames(match);
    for (let i = 0; i < match.moves.length; i++) {
      expect(frames[i].state.moves).toHaveLength(i + 1);
    }
    expect(frames.at(-1)!.state.result).toBe('X');
    // Igual ao replay direto do motor (RN-REPLAY-02).
    expect(JSON.stringify(frames[4].state.board)).toBe(
      JSON.stringify(replay({ config: classic, moves: match.moves.slice(0, 5) }).board),
    );
  });

  it('partida vazia não gera frames', () => {
    expect(buildFrames({ config: classic, moves: [] })).toHaveLength(0);
  });
});
