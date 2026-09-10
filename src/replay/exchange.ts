// Exportação e importação de partidas como arquivo (REQ-REPLAY-04, 05; RN-REPLAY-03).

import { replay } from '../engine';
import { normalizeMap } from '../theme/maps';
import type { LibraryEntry } from './library';

// RN-REPLAY-03: limite de tamanho do arquivo importado.
export const MAX_IMPORT_BYTES = 64 * 1024;

interface ExportedMatch {
  app: 'super-tictactoe';
  kind: 'match';
  version: 1;
  match: Omit<LibraryEntry, 'id'>;
}

export function exportEntry(entry: LibraryEntry): { text: string; filename: string } {
  const { id: _id, ...match } = entry;
  const payload: ExportedMatch = { app: 'super-tictactoe', kind: 'match', version: 1, match };
  const date = new Date(entry.finishedAt).toISOString().slice(0, 10);
  const clean = (name: string) =>
    (name || 'jogador').normalize('NFD').replace(/[^\w-]/g, '').slice(0, 16) || 'jogador';
  return {
    text: JSON.stringify(payload),
    filename: `super-tictactoe-${date}-${clean(entry.names.X)}-vs-${clean(entry.names.O)}.json`,
  };
}

// Valida o arquivo reproduzindo a partida no motor; qualquer defeito devolve null.
export function parseImported(text: string): Omit<LibraryEntry, 'id'> | null {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) return null;
  let payload: ExportedMatch;
  try {
    payload = JSON.parse(text) as ExportedMatch;
  } catch {
    return null;
  }
  if (
    payload?.app !== 'super-tictactoe' ||
    payload.kind !== 'match' ||
    payload.version !== 1 ||
    typeof payload.match !== 'object'
  ) {
    return null;
  }
  const match = payload.match;
  if (!match.config || !Array.isArray(match.moves) || !match.names) return null;
  try {
    const state = replay({ config: match.config, moves: match.moves });
    // Só partida terminada entra na biblioteca, e o resultado precisa bater.
    if (state.result === null || state.result !== match.result) return null;
  } catch {
    return null;
  }
  return {
    finishedAt: typeof match.finishedAt === 'number' ? match.finishedAt : Date.now(),
    mode: match.mode === 'bot' || match.mode === 'online' ? match.mode : 'local',
    names: {
      X: String(match.names.X ?? '').slice(0, 24),
      O: String(match.names.O ?? '').slice(0, 24),
    },
    config: match.config,
    moves: match.moves,
    result: match.result,
    // REQ-MAPAS-05: arquivo exportado antes do mapa existir vira galáxia.
    map: normalizeMap(match.map),
  };
}
