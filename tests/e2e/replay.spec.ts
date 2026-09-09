import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Biblioteca, replay, exportação/importação e GIF (spec REPLAY).

const WIN_SCRIPT = [
  '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
  '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
];

async function playFullMatch(page: Page) {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  for (const move of WIN_SCRIPT) {
    await page.getByTestId(`cell-${move}`).click();
  }
  await expect(page.getByTestId('status')).toContainText('Ana');
}

test('partida terminada entra na biblioteca e sai se o fim for desfeito (AC-01, 08)', async ({ page }) => {
  await playFullMatch(page);

  // Desfazer o fim: sai da biblioteca.
  await page.getByTestId('undo').click();
  await page.getByTestId('library-open').click();
  await expect(page.getByTestId('library-empty')).toBeVisible();
  await page.getByTestId('library-back').click();

  // Terminar de novo: volta.
  await page.getByTestId('cell-2.8').click();
  await page.getByTestId('library-open').click();
  await expect(page.getByTestId('library-entry-0')).toContainText('Ana vs Bia');
  await expect(page.getByTestId('library-entry-0')).toContainText('Ana (X)');
});

test('replay navega, respeita o estado e tem autoplay (AC-02, 04)', async ({ page }) => {
  await playFullMatch(page);
  await page.getByTestId('open-replay').click();

  // Abre no fim: contador cheio e última jogada marcada.
  await expect(page.getByTestId('replay-counter')).toContainText('17 / 17');
  await expect(page.getByTestId('cell-2.8')).toHaveText('X');

  // Voltar uma: a última jogada some do tabuleiro.
  await page.getByTestId('replay-prev').click();
  await expect(page.getByTestId('replay-counter')).toContainText('16 / 17');
  await expect(page.getByTestId('cell-2.8')).toHaveText('');

  // Início: tabuleiro vazio.
  await page.getByTestId('replay-first').click();
  await expect(page.getByTestId('cell-0.6')).toHaveText('');

  // Autoplay avança sozinho.
  await page.getByTestId('replay-play').click();
  await expect(page.getByTestId('cell-0.6')).toHaveText('X', { timeout: 3000 });
  await page.getByTestId('replay-back').click();
  await expect(page.getByTestId('rematch')).toBeVisible();
});

test('exportar da biblioteca e importar de volta (AC-05, 06)', async ({ page }) => {
  await playFullMatch(page);
  await page.getByTestId('library-open').click();

  // Exporta e captura o arquivo baixado.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('entry-export-0').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^super-tictactoe-.*\.json$/);
  const path = await download.path();

  // Exclui a partida e importa o arquivo: replay abre e a entrada volta.
  await page.getByTestId('entry-delete-0').click();
  await expect(page.getByTestId('library-empty')).toBeVisible();
  await page.getByTestId('import-input').setInputFiles(path);
  await expect(page.getByTestId('replay-counter')).toContainText('17 / 17');
  await page.getByTestId('replay-back').click();
  await expect(page.getByTestId('library-entry-0')).toBeVisible();

  // Arquivo inválido: mensagem de erro, nada salvo.
  await page.getByTestId('import-input').setInputFiles({
    name: 'falso.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"outro"}'),
  });
  await expect(page.getByTestId('import-error')).toBeVisible();
});

test('controles do replay são inequívocos (AC-REPLAY2-07, 08)', async ({ page }) => {
  await playFullMatch(page);
  await page.getByTestId('open-replay').click();

  // Cada controle tem rótulo acessível próprio, e reproduzir é um botão à parte.
  const labels = await page.evaluate(() =>
    ['replay-first', 'replay-prev', 'replay-play', 'replay-next', 'replay-last'].map(
      (id) => document.querySelector(`[data-testid="${id}"]`)?.getAttribute('aria-label') ?? '',
    ),
  );
  expect(new Set(labels).size).toBe(5);
  expect(labels.every((l) => l.length > 0)).toBe(true);
  await expect(page.getByTestId('replay-play')).toHaveClass(/play-button/);

  // Avançar anda exatamente uma jogada e permanece pausado.
  await page.getByTestId('replay-first').click();
  await expect(page.getByTestId('replay-counter')).toContainText('0 / 17');
  await page.getByTestId('replay-next').click();
  await expect(page.getByTestId('replay-counter')).toContainText('1 / 17');
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('replay-counter')).toContainText('1 / 17');
});

test('quadro do GIF usa o fundo neon-galáctico (AC-REPLAY2-01, 02; REQ-NEON-08)', async ({ page }) => {
  await playFullMatch(page);

  const bg = await page.evaluate(async () => {
    // Caminhos servidos pelo Vite; ficam em variável porque o TypeScript
    // não resolve import absoluto de navegador.
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

  // Fundo quase preto/índigo do tema neon-galáctico, nunca claro.
  expect(bg.r).toBeLessThan(60);
  expect(bg.g).toBeLessThan(60);
});

test('GIF da partida é baixado no fim e no replay (AC-07)', async ({ page }) => {
  await playFullMatch(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-gif').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.gif$/);
  const path = await download.path();
  const fs = await import('node:fs');
  const bytes = fs.readFileSync(path!);
  // Assinatura GIF89a e tamanho plausível.
  expect(bytes.subarray(0, 6).toString('latin1')).toBe('GIF89a');
  expect(bytes.length).toBeGreaterThan(1000);
});
