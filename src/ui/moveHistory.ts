// Descreve uma entrada do histórico (jogada normal ou jogada de carta,
// spec CARTAS) pro painel de histórico em GameScreen.tsx e pro replay.

import type { Move } from '../engine';
import type { Messages } from '../i18n';
import { cardName } from './cardMeta';

function board(msgs: Messages, i: number): string {
  return `${msgs.boardLabel} ${i + 1}`;
}

function cell(msgs: Messages, path: number[]): string {
  return `${board(msgs, path[0])}, ${msgs.cellLabel} ${path[path.length - 1] + 1}`;
}

export function describeMove(msgs: Messages, move: Move): string {
  if (!move.card) return cell(msgs, move.path);

  const name = cardName(msgs, move.card);
  switch (move.card) {
    case 'salto-estelar':
    case 'buraco-negro':
      return `${name} — ${cell(msgs, move.path)}`;
    case 'estrela-da-sorte':
      return `${name} — ${board(msgs, move.path[0])} + ${board(msgs, move.path2![0])}, ${msgs.cellLabel} ${
        move.cellIndex! + 1
      }`;
    case 'correnteza':
      return `${name} — ${cell(msgs, move.path)} → ${msgs.cellLabel} ${move.path2![move.path2!.length - 1] + 1}`;
    default: // devorador-de-tabuleiro, supernova, bolha-protecao, tempestade, tsunami, mare-virada
      return `${name} — ${board(msgs, move.path[0])}`;
  }
}
