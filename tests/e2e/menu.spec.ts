import { expect, test } from '@playwright/test';

// Spec MENU: home com código em destaque e modos de jogo, link de convite,
// reticências animadas e padronização de componentes.

test('home mostra código em destaque e os modos de jogo (sem bot, removido)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('join-code')).toBeVisible();
  await expect(page.getByTestId('mode-online')).toBeVisible();
  await expect(page.getByTestId('mode-local')).toBeVisible();
  await expect(page.getByTestId('mode-bot')).toHaveCount(0);
  // idioma do navegador de teste pode ser pt ou en.
  await expect(page.getByTestId('mode-local')).toContainText(/2 (jogadores|players)/);
});

test('código inválido no campo de entrar mostra erro e não avança', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('join-code').fill('AB');
  await page.getByTestId('join-go').click();
  await expect(page.getByTestId('code-error')).toBeVisible();
  await expect(page.getByTestId('mode-online')).toBeVisible();
});

test('link de convite (?join=CODIGO) pula a home e vai direto pra escolha de nome', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await page.goto('/?join=ABCDEF');
  await expect(page.getByTestId('mode-online')).toBeHidden();
  await expect(page.getByTestId('name-1')).toBeVisible();
  await expect(page.getByTestId('start')).toBeVisible();
  await expect(page.locator('.code-field').first()).toContainText('ABCDEF');
  // O código não fica preso na URL (recarregar não tenta entrar de novo).
  expect(page.url()).not.toContain('join=');
});

test('sala do host tem botão de copiar e de compartilhar o código', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await page.goto('/');
  await page.getByTestId('mode-online').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('online-waiting')).toBeVisible();
  await expect(page.getByTestId('copy-code')).toBeVisible();
  await expect(page.getByTestId('share-code')).toBeVisible();
});

test('texto de espera anima as reticências', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stt.transport', 'broadcast'));
  await page.goto('/');
  await page.getByTestId('mode-online').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('start').click();
  const dots = page.getByTestId('online-waiting').locator('[aria-hidden="true"]').last();
  const first = await dots.innerText();
  await expect
    .poll(async () => dots.innerText(), { timeout: 2000 })
    .not.toBe(first);
});

test('clicar no botão de reproduzir do replay não deixa anel de foco', async ({ page }) => {
  const winScript = [
    '0.6', '6.0', '0.7', '7.0', '0.8', '8.1', '1.6', '6.1', '1.7', '7.1',
    '1.8', '8.2', '2.6', '6.2', '2.7', '7.2', '2.8',
  ];
  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('name-1').fill('Ana');
  await page.getByTestId('name-2').fill('Bia');
  await page.getByTestId('start').click();
  for (const move of winScript) await page.getByTestId(`cell-${move}`).click();
  await page.getByTestId('open-replay').click();
  const playButton = page.getByTestId('replay-play');
  await playButton.click();
  const outline = await playButton.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('none');
});
