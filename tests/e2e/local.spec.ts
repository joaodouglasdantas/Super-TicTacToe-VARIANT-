import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Fluxo do modo local (REQ-STT-04, 07, 08, 09, 10, 12; AC-STT-01, 02).

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
}

test('jogada direciona o adversário e destaca o tabuleiro permitido (AC-STT-01)', async ({ page }) => {
  await startGame(page);
  // X joga na célula 0 do tabuleiro 4.
  await page.getByTestId('cell-4.0').click();
  // O tabuleiro 0 fica destacado como jogável; os outros não.
  await expect(page.getByTestId('board-0')).toHaveClass(/playable/);
  await expect(page.getByTestId('board-4')).not.toHaveClass(/playable/);
  await expect(page.getByTestId('status')).toContainText('Bia');
});

test('jogada fora do tabuleiro obrigatório é rejeitada (AC-STT-02)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click(); // O obrigado ao tabuleiro 0
  // Célula de outro tabuleiro está desabilitada; clicar não muda nada.
  const forbidden = page.getByTestId('cell-8.8');
  await expect(forbidden).toBeDisabled();
  await forbidden.click({ force: true });
  await expect(forbidden).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Bia');
});

test('desfazer volta a última jogada (REQ-STT-07)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click();
  await expect(page.getByTestId('cell-4.0')).toHaveText('X');
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('cell-4.0')).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Ana');
});

test('sair da partida em andamento com confirmação (AC-CONEXAO-05, 06)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click();

  // Cancelar mantém a partida exatamente como estava.
  await page.getByTestId('leave-match').click();
  await page.getByTestId('leave-cancel').click();
  await expect(page.getByTestId('cell-4.0')).toHaveText('X');

  // Confirmar volta pra home e não deixa partida pendente.
  await page.getByTestId('leave-match').click();
  await page.getByTestId('leave-confirm').click();
  await expect(page.getByTestId('mode-local')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('mode-local')).toBeVisible();
  await expect(page.getByTestId('resume-dialog')).toBeHidden();
});

test('risco na linha vencedora, pequeno e grande (AC-RISCO-01, 02, 06)', async ({ page }) => {
  await startGame(page);
  const script = [
    '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
    '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
  ];

  // Antes de fechar qualquer linha, não há risco.
  await expect(page.locator('.strike')).toHaveCount(0);

  // Cinco jogadas fecham o tabuleiro 1: risco pequeno aparece.
  for (const move of script.slice(0, 5)) await page.getByTestId(`cell-${move}`).click();
  await expect(page.getByTestId('board-0').locator('.strike')).toHaveCount(1);
  await expect(page.getByTestId('board-root').locator('> .strike-layer .strike')).toHaveCount(0);

  // Desfazer a jogada que fechou remove o risco (AC-RISCO-06).
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('board-0').locator('.strike')).toHaveCount(0);
  await page.getByTestId('cell-0.8').click();
  await expect(page.getByTestId('board-0').locator('.strike')).toHaveCount(1);

  // Fim da partida: risco grande atravessando os três tabuleiros.
  for (const move of script.slice(5)) await page.getByTestId(`cell-${move}`).click();
  const bigStrike = page.getByTestId('board-root').locator('> .strike-layer .strike');
  await expect(bigStrike).toHaveCount(1);
});

// A animação do traço dura o mesmo tempo que o som daquele risco
// (--strike-dur-small/big em themes.css, calculadas a partir do mesmo clipe
// e velocidade que src/audio/sound.ts usa de verdade).
test('animação do risco dura o mesmo tempo que o som (grande mais longo que pequeno)', async ({ page }) => {
  await startGame(page);
  const script = [
    '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
    '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
  ];
  for (const move of script.slice(0, 5)) await page.getByTestId(`cell-${move}`).click();
  const smallDur = await page
    .getByTestId('board-0')
    .locator('.strike')
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);

  for (const move of script.slice(5)) await page.getByTestId(`cell-${move}`).click();
  const bigDur = await page
    .getByTestId('board-root')
    .locator('> .strike-layer .strike')
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);

  expect(smallDur).toBe('0.382s');
  expect(bigDur).toBe('0.553s');
});

test('histórico registra as jogadas (REQ-STT-10)', async ({ page }) => {
  await startGame(page);
  await page.getByTestId('cell-4.0').click();
  await page.getByTestId('cell-0.4').click();
  const items = page.getByTestId('history').locator('li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('X');
});

test('partida completa termina com anúncio, placar e revanche (AC-STT-04, REQ-STT-08, 09)', async ({ page }) => {
  await startGame(page);
  // Roteiro em que X (Ana) conquista os tabuleiros 0, 1 e 2 (validado no motor).
  const script = [
    '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
    '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
  ];
  for (const move of script) {
    await page.getByTestId(`cell-${move}`).click();
  }
  await expect(page.getByTestId('status')).toContainText('Ana');
  await expect(page.getByTestId('score')).toContainText('Ana (X): 1');

  // Revanche: novo tabuleiro, mesmo confronto, agora O (Bia) começa.
  await page.getByTestId('rematch').click();
  await expect(page.getByTestId('cell-0.6')).toHaveText('');
  await expect(page.getByTestId('status')).toContainText('Bia');
  await expect(page.getByTestId('score')).toContainText('Ana (X): 1');
});
