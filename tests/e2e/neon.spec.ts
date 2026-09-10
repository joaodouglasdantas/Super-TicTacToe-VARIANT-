import { expect, test } from '@playwright/test';

// Spec NEON: tema neon-galáctico único (sem alternância claro/escuro) e
// fundo decorativo (estrelas/partículas/criaturinhas) que nunca atrapalha a
// jogabilidade.

test('não existe mais alternador de tema nem textos "Caderno"/"Lousa" (AC-NEON-01)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('settings-open').click();
  await expect(page.getByTestId('settings-modal')).toBeVisible();
  await expect(page.getByTestId('theme-toggle')).toHaveCount(0);
  await expect(page.getByTestId('settings-modal')).not.toContainText(/Caderno|Lousa|Notebook|Chalkboard/);
});

test('o fundo decorativo nunca intercepta clique (AC-NEON-05, home e jogo)', async ({ page }) => {
  // Mapa fixo (spec MAPAS): este teste é sobre o mapa galáxia especificamente.
  await page.addInitScript(() => localStorage.setItem('stt.forceMap', 'galaxy'));
  await page.goto('/');
  const homePointerEvents = await page.locator('.planet-bg').evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(homePointerEvents).toBe('none');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();

  const gamePointerEvents = await page.locator('.cosmic-bg').evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(gamePointerEvents).toBe('none');
  await page.getByTestId('cell-4.4').click();
  await expect(page.getByTestId('cell-4.4')).toHaveText('X');
});

test('animações decorativas somem sob prefers-reduced-motion (AC-NEON-06, home e jogo)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stt.forceMap', 'galaxy'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const planetAnim = await page.locator('.planet-bg').evaluate((el) => getComputedStyle(el).animationName);
  expect(planetAnim).toBe('none');

  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  const starAnim = await page
    .locator('.cosmic-star')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(starAnim).toBe('none');
});
