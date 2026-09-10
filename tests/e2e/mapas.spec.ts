import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Spec MAPAS: mapa aleatório por partida (galáxia/praia), sincronizado no
// online, preservado em retomar/revanche/GIF, com fallback pra dado legado.

const WIN_SCRIPT = [
  '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
  '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
];

async function forceMap(page: Page, map: 'galaxy' | 'beach') {
  await page.addInitScript((m) => localStorage.setItem('stt.forceMap', m), map);
}

test('partida local sorteia um mapa válido, sem escolha do jogador (AC-MAPAS-01)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  const map = await page.locator('.app').getAttribute('data-map');
  expect(['galaxy', 'beach']).toContain(map);
});

test('host e guest veem o mesmo mapa (AC-MAPAS-02)', async ({ context }) => {
  const host = await context.newPage();
  await host.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await forceMap(host, 'beach'); // só o host sorteia (RN-MAPAS-03); força pra teste determinístico
  await host.goto('/');
  await host.getByTestId('mode-online').click();
  await host.getByTestId('name-1').fill('Ana');
  await host.getByTestId('start').click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  const code = (await host.getByTestId('room-code').first().innerText()).trim();

  const guest = await context.newPage();
  await guest.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await guest.goto('/');
  await guest.getByTestId('join-code').fill(code);
  await guest.getByTestId('join-go').click();
  await guest.getByTestId('name-1').fill('Bia');
  await guest.getByTestId('start').click();

  await expect(host.getByTestId('status')).toContainText('Ana', { timeout: 5000 });
  await expect(guest.getByTestId('status')).toContainText('Ana', { timeout: 5000 });
  await expect(host.locator('.app')).toHaveAttribute('data-map', 'beach');
  await expect(guest.locator('.app')).toHaveAttribute('data-map', 'beach');
});

test('retomar depois de recarregar mantém o mesmo mapa (AC-MAPAS-03)', async ({ page }) => {
  await forceMap(page, 'beach');
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.4').click();
  await expect(page.locator('.app')).toHaveAttribute('data-map', 'beach');

  await page.reload();
  await expect(page.getByTestId('resume-dialog')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.locator('.app')).toHaveAttribute('data-map', 'beach');
});

test('partida salva sem campo de mapa (dado legado) não quebra e vira galáxia (AC-MAPAS-04)', async ({ page }) => {
  // Força um mapa diferente do fallback: se o teste não forçasse, o sorteio
  // real (50/50) poderia coincidir com 'galaxy' por acaso e mascarar uma
  // falta de fallback de verdade (a asserção final só prova algo se o mapa
  // ANTES de simular o dado legado for 'beach').
  await forceMap(page, 'beach');
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.4').click();

  // Simula uma partida salva antes do campo `map` existir (spec CARTAS
  // moveu o campo pra dentro de `game.config`, ver src/storage/persist.ts).
  await page.evaluate(() => {
    const raw = localStorage.getItem('stt.match');
    if (!raw) return;
    const saved = JSON.parse(raw);
    delete saved.game.config.map;
    localStorage.setItem('stt.match', JSON.stringify(saved));
  });

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.reload();
  await expect(page.getByTestId('resume-dialog')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.locator('.app')).toHaveAttribute('data-map', 'galaxy');
  expect(errors).toEqual([]);
});

test('mapa praia usa paleta aquática, diferente da galáxia (AC-MAPAS-05)', async ({ page }) => {
  await forceMap(page, 'beach');
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  const markX = await page.locator('.app').evaluate((el) => getComputedStyle(el).getPropertyValue('--mark-x').trim());
  expect(markX).toBe('#ff8a5c'); // coral do mapa praia, não o magenta da galáxia (#ff3ec8)
});

test('GIF da partida no mapa praia reflete a paleta daquela partida (AC-MAPAS-06)', async ({ page }) => {
  await forceMap(page, 'beach');
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  for (const move of WIN_SCRIPT) await page.getByTestId(`cell-${move}`).click();
  await expect(page.getByTestId('status')).toContainText('Ana');

  const bg = await page.evaluate(async () => {
    const gifPath = '/src/replay/gif.ts';
    const enginePath = '/src/engine/index.ts';
    const gif = (await import(/* @vite-ignore */ gifPath)) as typeof import('../../src/replay/gif');
    const engine = (await import(/* @vite-ignore */ enginePath)) as typeof import('../../src/engine');
    const saved = JSON.parse(localStorage.getItem('stt.library') ?? '[]')[0];
    const state = engine.replay({ config: saved.config, moves: saved.moves });
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    gif.drawState(ctx, state, gif.themePalette());
    const [r, g, b] = ctx.getImageData(2, 2, 1, 1).data;
    return { r, g, b };
  });

  // Fundo do mapa praia (#03181c): quase preto, mas com g/b > r (tom azul-esverdeado),
  // diferente do fundo da galáxia (#07041c, roxo, b claramente > g).
  expect(bg.g).toBeGreaterThanOrEqual(bg.r);
});

test('revanche mantém o mapa da partida anterior (AC-MAPAS-07)', async ({ page }) => {
  await forceMap(page, 'beach');
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  for (const move of WIN_SCRIPT) await page.getByTestId(`cell-${move}`).click();
  await expect(page.getByTestId('status')).toContainText('Ana');
  await expect(page.locator('.app')).toHaveAttribute('data-map', 'beach');

  await page.getByTestId('rematch').click();
  await expect(page.locator('.app')).toHaveAttribute('data-map', 'beach');
});
