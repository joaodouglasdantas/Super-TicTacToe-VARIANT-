// Som de jogada (spec SOM, redesenhado pela spec NEON): blips e acordes
// curtos sintetizados por código, sem depender de gravação nem de rede.
//
// A spec SOM original (giz/lápis) tentou e rejeitou síntese três vezes,
// porque o alvo era imitar um som físico (o guincho de giz é um fenômeno de
// stick-slip, difícil de emular por osciladores). RN-NEON-01 revê essa
// decisão só para o timbre novo: um blip/chime de interface é um som
// nativamente eletrônico, não existe "gravação real" dele — ver seção 8 de
// `.specs/SOM/spec.md` e as Notas Técnicas de `.specs/NEON/spec.md`.
//
// A fila serial e a tabela de velocidade por evento (herdadas da spec SOM)
// continuam intactas: é o que garante que jogadas em sequência não se
// atropelam (RN-SOM-07, 10) e que desfazer não toca nada (RN-SOM-05).

export type Mark = 'X' | 'O';
export type StrikeScale = 'small' | 'big';

let context: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

// Descarta o contexto atual, pra recuperação de um contexto morto.
export function resetAudio(): void {
  try {
    void context?.close();
  } catch {
    // contexto já encerrado
  }
  context = null;
  queueFreeAt = 0;
}

// RN-SOM-04: falha de áudio nunca atrapalha o jogo.
function ensureContext(): AudioContext | null {
  if (muted) return null;
  try {
    if (context === null) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    // REQ-SOM-07: o contexto só sai do estado suspenso após um gesto do jogador.
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

// Duas "vozes" sintetizadas (REQ-NEON-07), no lugar dos dois clipes gravados
// (giz/lápis) de antes: `move` é um blip curto e redondo pra marca de uma
// jogada, `strike` é um mini-acorde de duas notas ascendentes, mais quente,
// pros riscos de vitória.
type Voice = 'move' | 'strike';

const VOICE_DURATION_S: Record<Voice, number> = { move: 0.13, strike: 0.21 };

// Qual voz cada evento usa — x/o soam a marca sendo escrita, small/big soam
// o risco que ela abriu.
const EVENT_VOICE: Record<'x' | 'o' | 'small' | 'big', Voice> = {
  x: 'move',
  o: 'move',
  small: 'strike',
  big: 'strike',
};

// Velocidade de reprodução por evento: mais rápido e agudo pro toque curto do
// X, mais devagar e grave pros riscos, como um gesto maior. A duração efetiva
// (usada pra reservar vaga na fila) é a duração da voz dividida pela taxa.
// `small.base`/`big.base` também definem, via VOICE_DURATION_S.strike, quanto
// tempo a animação do traço do risco leva na tela (--strike-dur-small e
// --strike-dur-big em themes.css): mudou a taxa ou a duração aqui, recalcula lá.
const RATE: Record<'x' | 'o' | 'small' | 'big', { base: number; jitter: number; gain: number }> = {
  x: { base: 0.97, jitter: 0.07, gain: 0.85 },
  o: { base: 0.82, jitter: 0.06, gain: 0.8 },
  small: { base: 0.55, jitter: 0.05, gain: 0.85 },
  big: { base: 0.38, jitter: 0.04, gain: 0.95 },
};

// Envelope percussivo curto (ataque rápido, decaimento suave): a mesma forma
// usada pra todo toque sintetizado, só muda frequência e duração da nota.
function pluckEnvelope(tRel: number, dur: number): number {
  if (tRel < 0 || tRel > dur) return 0;
  const attack = Math.min(0.006, dur * 0.2);
  if (tRel < attack) return tRel / attack;
  const decayRate = 3.5 / Math.max(dur - attack, 0.01);
  return Math.exp(-(tRel - attack) * decayRate);
}

// Uma nota: fundamental + um toque de segundo harmônico, pra não soar como
// bipe seco de 8-bit (alvo é "satisfatório e lofi", não sci-fi áspero).
function note(tRel: number, dur: number, freq: number): number {
  const env = pluckEnvelope(tRel, dur);
  if (env === 0) return 0;
  return env * (Math.sin(2 * Math.PI * freq * tRel) + 0.22 * Math.sin(4 * Math.PI * freq * tRel));
}

// `move`: um único toque redondo (E5). `strike`: duas notas ascendentes
// (C5 → E5, terça maior), o "ding-ding" de conquista.
function synthesizeSample(voice: Voice, t: number, duration: number): number {
  if (voice === 'move') {
    return note(t, duration, 659.25) * 0.75;
  }
  const firstDur = duration * 0.38;
  const secondDur = duration - firstDur;
  return (note(t, firstDur, 523.25) + note(t - firstDur, secondDur, 659.25)) * 0.6;
}

function synthesizeBuffer(ctx: AudioContext, voice: Voice): AudioBuffer {
  const duration = VOICE_DURATION_S[voice];
  const length = Math.max(1, Math.round(duration * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = synthesizeSample(voice, i / ctx.sampleRate, duration);
  }
  return buffer;
}

const bufferCache = new Map<string, AudioBuffer>();

function getVoiceBuffer(ctx: AudioContext, voice: Voice): AudioBuffer {
  const key = `${ctx.sampleRate}:${voice}`;
  let buffer = bufferCache.get(key);
  if (!buffer) {
    buffer = synthesizeBuffer(ctx, voice);
    bufferCache.set(key, buffer);
  }
  return buffer;
}

// Fila serial (RN-SOM-07, 10): sem ela, a marca do bot toca por cima da sua
// (ele responde rápido demais pro seu som terminar) e o risco tocava junto
// da marca que fechou a linha, virando uma pilha confusa de sons. Agora cada
// som só começa quando o anterior termina, mais uma folga curta pra separar
// no ouvido. Se a fila acumular mais de MAX_BACKLOG_S de atraso (jogadas
// muito rápidas, autoplay do replay), a PRÓXIMA JOGADA inteira é descartada
// em vez de empilhar: o áudio nunca fica muito atrás do que está na tela.
let queueFreeAt = 0; // AudioContext.currentTime da próxima vaga livre
// 0,035s media como "sem sobreposição", mas na prática soava atropelado: o
// ouvido só registra uma pausa de verdade acima de uns 100ms. Subido pra
// 0,15s (2026-09-03, feedback de jogo real contra o bot).
const MIN_GAP_S = 0.15;
// Sobe proporcionalmente ao MIN_GAP maior, senão um único risco pequeno já
// deixaria a fila perto do limite e derrubaria a próxima jogada com mais
// frequência.
const MAX_BACKLOG_S = 2.0;

// Reserva um horário de início, avançando a fila pela duração efetiva do
// evento. `extraGap` é uma pausa adicional intencional (ex: a mão tirando o
// giz da superfície entre as duas pernas do X), maior que o MIN_GAP padrão.
// Não decide sozinha se descarta: isso é responsabilidade de quem chama,
// uma vez por jogada (ver playMoveSounds).
function reserveSlot(durationS: number, extraGap = 0): number {
  const start = queueFreeAt + extraGap;
  queueFreeAt = start + durationS + MIN_GAP_S;
  return start;
}

function currentBacklogS(ctx: AudioContext): number {
  const now = ctx.currentTime;
  if (queueFreeAt < now) queueFreeAt = now; // fila zerou: nada acumulado
  return queueFreeAt - now;
}

// Toca a voz do evento, esticada pra virar o toque pedido (x, o ou risco),
// na vaga já reservada na fila serial.
function playTouch(ctx: AudioContext, event: keyof typeof RATE, start: number): void {
  const buffer = getVoiceBuffer(ctx, EVENT_VOICE[event]);
  const { base, jitter, gain } = RATE[event];
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = base + (Math.random() * 2 - 1) * jitter;

  const envelope = ctx.createGain();
  envelope.gain.value = gain * (0.9 + Math.random() * 0.2);

  source.connect(envelope).connect(ctx.destination);
  source.start(Math.max(start, ctx.currentTime + 0.003));
}

function effectiveDuration(event: keyof typeof RATE): number {
  return VOICE_DURATION_S[EVENT_VOICE[event]] / RATE[event].base;
}

// Toca a marca da jogada e os riscos que ela abriu (spec RISCO), tudo em
// fila, como um pacote só: ou toca inteiro, ou (fila muito cheia) não toca
// nada dessa jogada. REQ-SOM-02: X são dois toques com pausa real entre eles
// (a mão tira o material da superfície); O é um toque único mais longo.
// RN-SOM-08 (revista): o risco entra na fila logo após a marca, não mais
// simultâneo a ela.
export function playMoveSounds(sounds: import('./events').MoveSounds): void {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (currentBacklogS(ctx) > MAX_BACKLOG_S) return; // fila cheia: pula a jogada inteira

    if (sounds.mark === 'X') {
      playTouch(ctx, 'x', reserveSlot(effectiveDuration('x')));
      // extraGap soma ao MIN_GAP que a reserva do primeiro toque já deixou
      // (reserveSlot sempre adiciona MIN_GAP_S no final): 0,05 aqui dá uma
      // pausa total de ~0,2s entre as pernas, um pouco maior que a folga
      // genérica entre sons de jogadas diferentes, sem exagerar.
      playTouch(ctx, 'x', reserveSlot(effectiveDuration('x'), 0.05));
    } else if (sounds.mark === 'O') {
      playTouch(ctx, 'o', reserveSlot(effectiveDuration('o')));
    }
    for (const scale of sounds.strikes) {
      const event = scale === 'big' ? 'big' : 'small';
      playTouch(ctx, event, reserveSlot(effectiveDuration(event)));
    }
  } catch {
    // áudio indisponível: segue em silêncio
  }
}
