// REQ-STT-13 (preferências) e REQ-STT-14 (partida em andamento), via localStorage.
// Toda leitura/escrita é tolerante a falha: armazenamento indisponível não quebra o jogo.

import type { GameConfig, Move, Player, SerializedGame } from '../engine';
import type { Difficulty } from '../bot/bot';
import type { Language } from '../i18n';

// Modo da partida: local (dois humanos) ou contra o bot (REQ-STT-04, 05).
export type MatchMode =
  | { type: 'local' }
  | { type: 'bot'; difficulty: Difficulty; humanSymbol: Player };

export interface Preferences {
  language: Language | null;
  playerNames: [string, string];
  player1Symbol: Player;
  lastConfig: GameConfig | null;
  lastMode: MatchMode | null;
  muted: boolean;
}

export interface SessionScore {
  X: number;
  O: number;
  draws: number;
}

export interface SavedMatch {
  game: SerializedGame;
  playerNames: [string, string];
  player1Symbol: Player;
  score: SessionScore;
  mode: MatchMode;
}

// GAR-P2P-05: estado da partida online persistido por sala pra reconexão.
export interface SavedOnline {
  code: string;
  role: 'host' | 'guest';
  myName: string;
  config: GameConfig;
  hostSymbol: Player;
  moves: Move[];
  score: SessionScore;
  names: [string, string];
}

const PREFS_KEY = 'stt.prefs';
const MATCH_KEY = 'stt.match';
const ONLINE_KEY = 'stt.p2p';

const defaultPreferences: Preferences = {
  language: null,
  playerNames: ['', ''],
  player1Symbol: 'X',
  lastConfig: null,
  lastMode: null,
  muted: false,
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento cheio ou bloqueado: o jogo segue sem persistir
  }
}

export function loadPreferences(): Preferences {
  return { ...defaultPreferences, ...(read<Partial<Preferences>>(PREFS_KEY) ?? {}) };
}

export function savePreferences(prefs: Preferences): void {
  write(PREFS_KEY, prefs);
}

export function loadMatch(): SavedMatch | null {
  const match = read<SavedMatch>(MATCH_KEY);
  if (!match || !Array.isArray(match.game?.moves)) return null;
  // Partidas salvas antes do modo bot não traziam o campo.
  return { ...match, mode: match.mode ?? { type: 'local' } };
}

export function saveMatch(match: SavedMatch): void {
  write(MATCH_KEY, match);
}

export function clearMatch(): void {
  try {
    localStorage.removeItem(MATCH_KEY);
  } catch {
    // indisponível: nada a limpar
  }
}

// Entradas chaveadas por sala+papel: duas abas do mesmo navegador (host e
// guest da mesma sala, no limite) não sobrescrevem o save uma da outra.
type OnlineStore = Record<string, SavedOnline & { updatedAt: number }>;

function onlineKey(code: string, role: SavedOnline['role']): string {
  return `${code}:${role}`;
}

const SELF_KEY = 'stt.p2p.self';

// Devolve o save online desta aba (dica em sessionStorage, que sobrevive ao
// reload) ou, na falta dela, o mais recente.
export function loadOnline(): SavedOnline | null {
  const store = read<OnlineStore>(ONLINE_KEY);
  if (!store || typeof store !== 'object') return null;
  const valid = (s: SavedOnline | undefined) =>
    s && typeof s.code === 'string' && Array.isArray(s.moves) ? s : null;
  try {
    const self = sessionStorage.getItem(SELF_KEY);
    if (self && valid(store[self])) return store[self];
  } catch {
    // sem sessionStorage: cai no mais recente
  }
  const entries = Object.values(store).filter((s) => valid(s));
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function saveOnline(saved: SavedOnline): void {
  const store = read<OnlineStore>(ONLINE_KEY) ?? {};
  const key = onlineKey(saved.code, saved.role);
  store[key] = { ...saved, updatedAt: Date.now() };
  write(ONLINE_KEY, store);
  try {
    sessionStorage.setItem(SELF_KEY, key);
  } catch {
    // sem sessionStorage: segue só com o localStorage
  }
}

export function clearOnline(code?: string, role?: SavedOnline['role']): void {
  try {
    if (code && role) {
      const store = read<OnlineStore>(ONLINE_KEY) ?? {};
      delete store[onlineKey(code, role)];
      if (Object.keys(store).length > 0) {
        write(ONLINE_KEY, store);
        return;
      }
    }
    localStorage.removeItem(ONLINE_KEY);
  } catch {
    // indisponível: nada a limpar
  }
}
