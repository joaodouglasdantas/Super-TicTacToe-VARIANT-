import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Cartas de evento por mapa (spec CARTAS): concessão ao vencer um tabuleiro
// pequeno, visibilidade (dono vê a carta, adversário só a contagem — REQ-
// CARTAS-07) e efeito de uma carta jogada pela UI.

async function forceMap(page: Page, map: 'galaxy' | 'beach') {
  await page.addInitScript((m) => localStorage.setItem('stt.forceMap', m), map);
}

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
}

// Fecha o tabuleiro 0 (linha de cima) pra X (Ana) em 5 jogadas — mesmo
// roteiro validado em local.spec.ts pro risco pequeno. Com o mapa forçado
// pra galáxia, o sorteio (determinístico a partir de actionCount) sempre dá
// "Devorador de Tabuleiro" nesta posição.
const WIN_BOARD_0 = ['0.6', '6.0', '0.7', '7.0', '0.8'];

test('vencer um tabuleiro concede carta ao vencedor; adversário só vê a contagem (REQ-CARTAS-02, 07; AC-CARTAS-01)', async ({
  page,
}) => {
  await forceMap(page, 'galaxy');
  await startGame(page);
  for (const move of WIN_BOARD_0) await page.getByTestId(`cell-${move}`).click();

  // Vez de O (Bia): a mão mostrada é a dela (vazia); só a contagem da Ana aparece.
  await expect(page.getByTestId('status')).toContainText('Bia');
  await expect(page.getByTestId('card-hand')).toContainText('No cards yet');
  await expect(page.getByTestId('opponent-hand-count')).toContainText('1');
  await expect(page.getByTestId('hand-card-devorador-de-tabuleiro')).toHaveCount(0);

  // O joga (forçada pro tabuleiro 8) e a vez volta pra X: agora a carta dela aparece nomeada.
  await page.getByTestId('cell-8.0').click();
  await expect(page.getByTestId('status')).toContainText('Ana');
  await expect(page.getByTestId('hand-card-devorador-de-tabuleiro')).toBeVisible();
  await expect(page.getByTestId('opponent-hand-count')).toContainText('0');
});

test('jogar uma carta consome a vez e aplica o efeito (AC-CARTAS-05, REQ-CARTAS-06)', async ({ page }) => {
  await forceMap(page, 'galaxy');
  await startGame(page);
  for (const move of WIN_BOARD_0) await page.getByTestId(`cell-${move}`).click();
  await page.getByTestId('cell-8.0').click(); // O; vez volta pra X com a carta na mão

  await page.getByTestId('hand-card-devorador-de-tabuleiro').click();
  await expect(page.getByTestId('card-target-panel')).toBeVisible();
  const select = page.getByTestId('target-board');
  await select.selectOption({ index: 1 }); // primeiro tabuleiro aberto candidato
  const targetValue = await select.inputValue();
  const targetBoard = targetValue.split('.')[0];

  await page.getByTestId('confirm-card').click();

  // A jogada de carta consumiu a vez (foi pra O) e o tabuleiro escolhido
  // ficou bloqueado: nenhuma célula dele pode ser jogada por ninguém agora.
  await expect(page.getByTestId('status')).toContainText('Bia');
  await expect(page.getByTestId(`cell-${targetBoard}.0`)).toBeDisabled();
  await expect(page.getByTestId('card-target-panel')).toBeHidden();
  // A carta jogada some da mão de quem jogou.
  await page.getByTestId('cell-8.1').click(); // O joga livremente (tabuleiro 8 ainda aberto)
  await expect(page.getByTestId('hand-card-devorador-de-tabuleiro')).toHaveCount(0);
});
