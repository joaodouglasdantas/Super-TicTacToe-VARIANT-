// Protocolo p2p do Super TicTacToe, conforme a Contract Spec P2P (v = 1).

import type { GameConfig, Move, Path, Player } from '../engine';
import type { SessionScore } from '../storage/persist';
import type { MapTheme } from '../theme/maps';

export const PROTOCOL_VERSION = 1;

// CL-P2P-07: apelido limitado a 24 caracteres.
export const MAX_NAME_LENGTH = 24;

// CL-P2P-01: mensagens até 4 KiB.
export const MAX_MESSAGE_BYTES = 4096;

export type P2PMessage =
  | { t: 'hello'; v: number; name: string }
  | { t: 'config'; config: GameConfig; hostSymbol: Player; names: [string, string]; map: MapTheme }
  | { t: 'accept' }
  | { t: 'move'; seq: number; path: Path }
  | {
      t: 'sync';
      config: GameConfig;
      hostSymbol: Player;
      names: [string, string];
      moves: Move[];
      score: SessionScore;
      map: MapTheme;
    }
  | { t: 'undoReq'; toSeq: number }
  | { t: 'undoRes'; toSeq: number; ok: boolean }
  | { t: 'rematch' }
  | { t: 'rematchOk' }
  | { t: 'ping' }
  | { t: 'pong' }
  | { t: 'leave' };

export type MessageType = P2PMessage['t'];

const KNOWN_TYPES: MessageType[] = [
  'hello',
  'config',
  'accept',
  'move',
  'sync',
  'undoReq',
  'undoRes',
  'rematch',
  'rematchOk',
  'ping',
  'pong',
  'leave',
];

export function encodeMessage(msg: P2PMessage): string {
  const raw = JSON.stringify(msg);
  if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
    throw new Error(`mensagem excede ${MAX_MESSAGE_BYTES} bytes: ${msg.t}`);
  }
  return raw;
}

// Decodifica dados recebidos. Devolve null pra lixo ou tipo desconhecido
// (CL-P2P-06: desconhecido é ignorado em silêncio, nunca derruba a sessão).
export function decodeMessage(raw: unknown): P2PMessage | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;
  const msg = value as { t?: unknown };
  if (typeof msg.t !== 'string' || !KNOWN_TYPES.includes(msg.t as MessageType)) {
    return null;
  }
  return value as P2PMessage;
}

export function sanitizeName(name: unknown): string {
  return typeof name === 'string' ? name.slice(0, MAX_NAME_LENGTH) : '';
}

// Código de sala: 6 caracteres sem ambiguidade (sem I, O, 0, 1).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return code.length === ROOM_CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
    ? code
    : null;
}

export function roomPeerId(code: string): string {
  return `stt-${code}`;
}
