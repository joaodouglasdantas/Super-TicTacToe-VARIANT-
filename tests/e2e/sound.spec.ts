import { expect, test } from '@playwright/test';

// Som de jogada (spec SOM, redesenhado pela spec NEON): blips sintetizados
// por Web Audio, sem depender de gravação nem de rede (REQ-NEON-07).

test('sons sintetizados tocam sem erro e sem nenhuma requisição de rede (AC-NEON-02)', async ({ page }) => {
  const errors: string[] = [];
  const soundRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    if (r.url().includes('/sounds/')) soundRequests.push(r.url());
  });

  await page.goto('/');
  await page.getByTestId('mode-local').click();
  await page.getByTestId('start').click();

  await page.getByTestId('cell-4.0').click(); // X
  await page.getByTestId('cell-0.4').click(); // O
  await page.waitForTimeout(400);

  expect(errors).toEqual([]);
  expect(soundRequests).toEqual([]);
});

test('desfazer não dispara som novo (RN-SOM-05, AC-NEON-03)', async ({ page }) => {
  await page.goto('/');

  const counts = await page.evaluate(async () => {
    const soundModule = '/src/audio/sound.ts';
    const snd = (await import(/* @vite-ignore */ soundModule)) as typeof import('../../src/audio/sound');
    const eventsModule = '/src/audio/events.ts';
    const evt = (await import(/* @vite-ignore */ eventsModule)) as typeof import('../../src/audio/events');
    const engineModule = '/src/engine/index.ts';
    const engine = (await import(/* @vite-ignore */ engineModule)) as typeof import('../../src/engine');

    const ctx = new AudioContext();
    await ctx.resume();
    let started = 0;
    const origStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, when?: number) {
      started++;
      return origStart.call(this, when);
    };

    snd.resetAudio();
    const RealCtor = window.AudioContext;
    // Precisa ser construível (`new`), então nada de arrow function aqui.
    // @ts-expect-error substituição só pra medir neste teste
    window.AudioContext = function AudioContextStub() {
      return ctx;
    };
    snd.setMuted(false);

    const classic = {
      depth: 2,
      clearVariant: false,
      tiebreak: 'majority' as const,
      startingPlayer: 'X' as const,
      map: 'galaxy' as const,
    };
    const before = engine.createGame(classic);
    const after = engine.applyMove(before, [4, 4]);
    snd.playMoveSounds(evt.soundsForTransition(before, after));
    await new Promise((r) => setTimeout(r, 200));
    const afterMove = started;

    const undone = engine.undo(after);
    snd.playMoveSounds(evt.soundsForTransition(after, undone));
    await new Promise((r) => setTimeout(r, 200));
    const afterUndo = started;

    window.AudioContext = RealCtor;
    await ctx.close();
    return { afterMove, afterUndo };
  });

  expect(counts.afterMove).toBeGreaterThan(0); // a marca tocou
  expect(counts.afterUndo).toBe(counts.afterMove); // desfazer não somou nada
});

// RN-SOM-07, 10: sons de jogadas próximas não tocam por cima uns dos outros.
test('sons de jogadas seguidas ficam em fila, sem sobrepor (RN-SOM-07, 10)', async ({ page }) => {
  await page.goto('/');

  const events = await page.evaluate(async () => {
    const soundModule = '/src/audio/sound.ts';
    const snd = (await import(/* @vite-ignore */ soundModule)) as typeof import('../../src/audio/sound');
    const ctx = new AudioContext();
    await ctx.resume();

    const starts: { start: number; dur: number }[] = [];
    const origStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, when?: number) {
      // Duração real ao ouvido: a voz é esticada por playbackRate (x rápido,
      // riscos mais devagar), então a duração bruta do buffer não basta aqui.
      const effDur = this.buffer!.duration / (this.playbackRate.value || 1);
      starts.push({ start: +(when ?? 0).toFixed(3), dur: +effDur.toFixed(3) });
      return origStart.call(this, when);
    };

    snd.resetAudio();
    const RealCtor = window.AudioContext;
    // Precisa ser construível (`new`), então nada de arrow function aqui.
    // @ts-expect-error substituição só pra medir neste teste
    window.AudioContext = function AudioContextStub() {
      return ctx;
    };
    snd.setMuted(false);

    // Cenário representativo: jogador marca O, e 100ms depois (tempo real,
    // como o bot faz) chega a resposta do adversário, fechando um tabuleiro.
    snd.playMoveSounds({ mark: 'O', strikes: [] });
    await new Promise((r) => setTimeout(r, 100));
    snd.playMoveSounds({ mark: 'X', strikes: ['small'] });
    await new Promise((r) => setTimeout(r, 80));

    window.AudioContext = RealCtor;
    await ctx.close();
    return starts;
  });

  // toque do o: 1, as duas pernas do x: 2, risco pequeno: 1 → 4 sons, nenhum descartado
  expect(events).toHaveLength(4);
  const sorted = [...events].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].start + sorted[i - 1].dur;
    // cada som só começa quando o anterior já tinha terminado (sem sobrepor)
    expect(sorted[i].start).toBeGreaterThanOrEqual(prevEnd - 0.001);
  }
});

// RN-SOM-08 revista: jogada que fecha um tabuleiro E vence a partida no
// mesmo lance nunca perde o risco grande (o som da vitória) por causa do
// limite de atraso da fila; o pacote da jogada toca inteiro, ou nada dele.
test('marca + risco pequeno + risco grande da mesma jogada tocam por inteiro', async ({ page }) => {
  await page.goto('/');
  const count = await page.evaluate(async () => {
    const soundModule = '/src/audio/sound.ts';
    const snd = (await import(/* @vite-ignore */ soundModule)) as typeof import('../../src/audio/sound');
    const ctx = new AudioContext();
    await ctx.resume();
    let n = 0;
    const origStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, when?: number) {
      n++;
      return origStart.call(this, when);
    };
    snd.resetAudio();
    const RealCtor = window.AudioContext;
    // @ts-expect-error substituição só pra medir neste teste
    window.AudioContext = function AudioContextStub() {
      return ctx;
    };
    snd.setMuted(false);
    snd.playMoveSounds({ mark: 'X', strikes: ['small', 'big'] });
    await new Promise((r) => setTimeout(r, 50));
    window.AudioContext = RealCtor;
    await ctx.close();
    return n;
  });
  expect(count).toBe(4); // x1, x2, risco pequeno, risco grande: nada cortado
});
