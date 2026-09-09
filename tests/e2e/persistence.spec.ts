import { expect, test } from '@playwright/test';

// REQ-STT-13, REQ-STT-14, REQ-STT-17; AC-STT-10, AC-STT-14.

test('partida em andamento é oferecida pra retomada ao reabrir (AC-STT-10)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.0').click();
  await page.getByTestId('cell-0.4').click();

  await page.reload();
  await expect(page.getByTestId('resume-dialog')).toBeVisible();
  await page.getByTestId('resume').click();

  // Estado exato: jogadas na mesa, histórico preservado e vez correta.
  await expect(page.getByTestId('cell-4.0')).toHaveText('X');
  await expect(page.getByTestId('cell-0.4')).toHaveText('O');
  await expect(page.getByTestId('history').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('status')).toContainText('Ana');
});

test('descartar a partida salva leva à home', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.0').click();
  await page.reload();
  await page.getByTestId('discard').click();
  await expect(page.getByTestId('mode-local')).toBeVisible();
});

test('troca de idioma aplica e persiste (AC-STT-14, REQ-STT-17)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('settings-open').click();
  await page.getByTestId('language').selectOption('en');
  await page.getByTestId('settings-close').click();
  await expect(page.getByTestId('mode-online')).toContainText('Create room');
  await page.reload();
  await expect(page.getByTestId('mode-online')).toContainText('Create room');
  await page.getByTestId('settings-open').click();
  await page.getByTestId('language').selectOption('pt');
  await page.getByTestId('settings-close').click();
  await expect(page.getByTestId('mode-online')).toContainText('Criar sala');
});

test('nomes dos jogadores persistem como preferência (REQ-STT-13)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  await page.evaluate(() => localStorage.removeItem('stt.match'));
  await page.reload();
  await page.getByTestId('mode-local').click();
  await expect(page.getByTestId('name-1')).toHaveValue('Ana');
  await expect(page.getByTestId('name-2')).toHaveValue('Bia');
});

test('silenciar persiste entre sessões (REQ-SOM-04, AC-SOM-04)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('settings-open').click();
  const toggle = page.getByTestId('mute-toggle');
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.reload();
  await page.getByTestId('settings-open').click();
  await expect(page.getByTestId('mute-toggle')).toBeChecked();
});
