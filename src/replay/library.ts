// Biblioteca local de partidas terminadas (REQ-REPLAY-01, 02; RN-REPLAY-01..04).

import type { GameConfig, Move, Player, Result } from '../engine';
import { normalizeMap } from '../theme/maps';
import type { MapTheme } from '../theme/maps';

export type LibraryMode = 'local' | 'online';

export interface LibraryEntry {
  id: string;
  finishedAt: number; // epoch ms
  mode: LibraryMode;
  names: Record<Player, string>;
  config: GameConfig;
  moves: Move[];
  result: Exclude<Result, null>;
  map: MapTheme;
}

const KEY = 'stt.library';

// RN-REPLAY-04: no máximo 100 partidas; as mais antigas caem.
export const LIBRARY_LIMIT = 100;

function readAll(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: LibraryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // armazenamento indisponível: a biblioteca simplesmente não persiste
  }
}

export function listLibrary(): LibraryEntry[] {
  return readAll().map((entry) => ({
    ...entry,
    // REQ-MAPAS-05: entrada salva antes do mapa existir vira galáxia.
    map: normalizeMap(entry.map),
    // Entrada salva quando o modo bot ainda existia (removido depois): sem
    // consumidor que leia este campo hoje, mas normaliza pra bater com o tipo.
    mode: entry.mode === 'online' ? 'online' : 'local',
  }));
}

export function addToLibrary(entry: Omit<LibraryEntry, 'id' | 'finishedAt'>): LibraryEntry {
  const full: LibraryEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    finishedAt: Date.now(),
  };
  const list = [full, ...readAll()].slice(0, LIBRARY_LIMIT);
  writeAll(list);
  return full;
}

// RN-REPLAY-01: desfazer o fim tira a entrada da biblioteca.
export function removeFromLibrary(id: string): void {
  writeAll(readAll().filter((entry) => entry.id !== id));
}
