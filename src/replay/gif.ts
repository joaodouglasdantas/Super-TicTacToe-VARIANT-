// GIF leve da partida (REQ-REPLAY-06): um frame por jogada e um final demorado,
// desenhado em canvas com o mesmo visual da tela (spec REPLAY2).

import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { getNode, isBoard, replay, resultOf, winningLines } from '../engine';
import type { Board, GameState } from '../engine';
import type { LibraryEntry } from './library';

export interface GifFrame {
  state: GameState;
  delayMs: number;
}

export const FRAME_DELAY_MS = 500;
export const FINAL_DELAY_MS = 2500;

// Parte pura e testável: os estados de cada frame (AC-REPLAY-07: M + 1 frames,
// do estado após a 1ª jogada ao final, que se repete com atraso maior).
export function buildFrames(entry: Pick<LibraryEntry, 'config' | 'moves'>): GifFrame[] {
  const frames: GifFrame[] = [];
  for (let n = 1; n <= entry.moves.length; n++) {
    frames.push({
      state: replay({ config: entry.config, moves: entry.moves.slice(0, n) }),
      delayMs: FRAME_DELAY_MS,
    });
  }
  if (frames.length > 0) {
    frames.push({ ...frames[frames.length - 1], delayMs: FINAL_DELAY_MS });
  }
  return frames;
}

export interface GifPalette {
  bg: string;
  line: string;
  lineSoft: string;
  x: string;
  o: string;
}

// Lê as cores do tema em uso direto das variáveis de CSS (RN-REPLAY2-01).
export function themePalette(): GifPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', '#07041c'),
    line: read('--line', '#8f6bff'),
    lineSoft: read('--line-soft', 'rgba(143,107,255,0.38)'),
    x: read('--mark-x', '#ff3ec8'),
    o: read('--mark-o', '#29e0ff'),
  };
}

export const GIF_SIZE = 512;

// Traço reto com brilho neon (REQ-NEON-08): substitui o tremor de traço à
// mão da spec REPLAY2 original, pra bater com o board sem squiggle na tela.
function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  size: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(2, width * 1.4);
  for (const t of [1 / 3, 2 / 3]) {
    drawLine(ctx, x0 + size * t, y0 + size * 0.02, x0 + size * t, y0 + size * 0.98);
    drawLine(ctx, x0 + size * 0.02, y0 + size * t, x0 + size * 0.98, y0 + size * t);
  }
  ctx.shadowBlur = 0;
}

// Risco na linha vencedora, com a mesma extrapolação da tela (REQ-RISCO-06).
function drawStrikes(
  ctx: CanvasRenderingContext2D,
  board: Board,
  tiebreak: GameState['config']['tiebreak'],
  x0: number,
  y0: number,
  size: number,
  color: string,
  width: number,
  alpha = 1,
): void {
  const lines = winningLines(board, tiebreak);
  if (lines.length === 0) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(3, width * 1.6);
  const cell = size / 3;
  const overshoot = cell * 0.22;
  for (const line of lines) {
    const first = line[0];
    const last = line[line.length - 1];
    const ax = x0 + ((first % 3) + 0.5) * cell;
    const ay = y0 + (Math.floor(first / 3) + 0.5) * cell;
    const bx = x0 + ((last % 3) + 0.5) * cell;
    const by = y0 + (Math.floor(last / 3) + 0.5) * cell;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    drawLine(
      ctx,
      ax - (dx / len) * overshoot,
      ay - (dy / len) * overshoot,
      bx + (dx / len) * overshoot,
      by + (dy / len) * overshoot,
    );
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function drawState(ctx: CanvasRenderingContext2D, state: GameState, palette: GifPalette): void {
  const size = GIF_SIZE;
  const { tiebreak } = state.config;

  // Fundo do tema neon-galáctico (REQ-NEON-08).
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, size, size);

  const margin = size * 0.04;
  const boardSize = size - margin * 2;
  const subSize = boardSize / 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cellFont = `600 ${Math.round(boardSize / 12)}px "Rajdhani", sans-serif`;
  const bigFont = `800 ${Math.round(boardSize / 5)}px "Orbitron", "Rajdhani", sans-serif`;

  for (let b = 0; b < 9; b++) {
    const sub = getNode(state.board, [b]);
    if (!isBoard(sub)) continue;
    const sx = margin + (b % 3) * subSize;
    const sy = margin + Math.floor(b / 3) * subSize;
    const inner = subSize * 0.1;
    const innerSize = subSize - inner * 2;
    const decided = resultOf(sub as Board, tiebreak);
    const struck = winningLines(sub as Board, tiebreak).length > 0;

    // Mesmos pesos da tela: no tabuleirinho conquistado a marca grande é a
    // protagonista, com jogadas e risco de fundo.
    ctx.globalAlpha = struck ? 0.4 : decided !== null ? 0.3 : 1;
    drawGrid(ctx, sx + inner, sy + inner, innerSize, 2, palette.lineSoft);
    ctx.font = cellFont;
    for (let c = 0; c < 9; c++) {
      const value = (sub as Board).cells[c];
      if (value !== 'X' && value !== 'O') continue;
      ctx.fillStyle = value === 'X' ? palette.x : palette.o;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 4;
      ctx.fillText(
        value,
        sx + inner + ((c % 3) + 0.5) * (innerSize / 3),
        sy + inner + (Math.floor(c / 3) + 0.55) * (innerSize / 3),
      );
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    if (decided !== null) {
      ctx.globalAlpha = struck ? 0.95 : 0.75;
      ctx.font = bigFont;
      ctx.fillStyle =
        decided === 'X' ? palette.x : decided === 'O' ? palette.o : palette.line;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillText(decided === 'draw' ? '=' : decided, sx + subSize / 2, sy + subSize * 0.56);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    drawStrikes(
      ctx,
      sub as Board,
      tiebreak,
      sx + inner,
      sy + inner,
      innerSize,
      decided === 'X' ? palette.x : palette.o,
      Math.max(3, size * 0.008),
      0.45,
    );
  }

  // Grade do jogo grande por cima, como na tela.
  drawGrid(ctx, margin, margin, boardSize, Math.max(4, size * 0.011), palette.line);

  const winner = resultOf(state.board, tiebreak);
  drawStrikes(
    ctx,
    state.board,
    tiebreak,
    margin,
    margin,
    boardSize,
    winner === 'X' ? palette.x : palette.o,
    Math.max(5, size * 0.016),
  );
}

// A fonte do tema precisa estar carregada antes do primeiro quadro, senão o
// canvas desenha com a fonte padrão do sistema (REQ-REPLAY2-03).
async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('600 40px "Rajdhani"'),
      document.fonts.load('800 80px "Orbitron"'),
    ]);
  } catch {
    // fonte indisponível: segue com a reserva, sem travar o download
  }
}

// Gera o GIF completo (só no navegador; a parte testável a seco é buildFrames).
//
// Paleta única pra todos os quadros: antes cada quadro tinha sua própria
// paleta de 64 cores (quantize por quadro), então o GIF acabava com uma
// tabela de cores global (a do primeiro quadro) e uma tabela local extra em
// cada um dos outros, um GIF tecnicamente válido, mas que alguns app de
// mensagem lidam pior do que com um GIF de tabela de cores só global. Como o
// tema tem poucas cores fixas, uma paleta combinando todos os quadros cabe
// tranquilamente nas 64 cores e sai mais leve, sem essa duplicação.
export async function generateGif(
  entry: Pick<LibraryEntry, 'config' | 'moves'>,
): Promise<Blob> {
  await ensureFonts();
  const frames = buildFrames(entry);
  const canvas = document.createElement('canvas');
  canvas.width = GIF_SIZE;
  canvas.height = GIF_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const palette = themePalette();

  // 1ª passada: desenha e guarda os pixels de cada quadro.
  const rendered: ImageData[] = frames.map((frame) => {
    drawState(ctx, frame.state, palette);
    return ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
  });

  // Paleta global combinando os pixels de todos os quadros.
  const totalLength = rendered.reduce((n, img) => n + img.data.length, 0);
  const combined = new Uint8ClampedArray(totalLength);
  let offset = 0;
  for (const img of rendered) {
    combined.set(img.data, offset);
    offset += img.data.length;
  }
  const colors = quantize(combined, 64);

  // 2ª passada: cada quadro indexado pela mesma paleta; só o 1º quadro
  // carrega a paleta no arquivo (os demais reusam a global automaticamente).
  const gif = GIFEncoder();
  rendered.forEach((img, i) => {
    const index = applyPalette(img.data, colors);
    gif.writeFrame(index, GIF_SIZE, GIF_SIZE, {
      delay: frames[i].delayMs,
      ...(i === 0 ? { palette: colors } : {}),
    });
  });
  gif.finish();
  const bytes = gif.bytes();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([buffer as ArrayBuffer], { type: 'image/gif' });
}
