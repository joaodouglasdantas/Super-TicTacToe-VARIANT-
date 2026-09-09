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

test('o fundo decorativo nunca intercepta clique no tabuleiro (AC-NEON-05)', async ({ page }) => {
  await page.goto('/');
  const pointerEvents = await page.locator('.cosmic-bg').evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pointerEvents).toBe('none');

  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();
  await page.getByTestId('cell-4.4').click();
  await expect(page.getByTestId('cell-4.4')).toHaveText('X');
});

test('animações decorativas somem sob prefers-reduced-motion (AC-NEON-06)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const animationName = await page
    .locator('.cosmic-star')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe('none');
});
