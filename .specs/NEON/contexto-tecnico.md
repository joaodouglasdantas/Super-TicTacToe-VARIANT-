# Guia de Contexto Técnico — NEON: Redesign visual e sonoro neon-galáctico

## 1. O que foi alterado

Antes: o jogo tinha dois temas visuais (claro "Caderno"/escuro "Lousa", alternador salvo em preferências), com traço tremido de giz/lápis (filtro SVG `squiggle`), fontes cursivas (Patrick Hand/Caveat), linhas de caderno no fundo, e efeitos sonoros a partir de duas gravações reais (`pencil.mp3`/`chalk.mp3`) escolhidas conforme o tema.

Agora: existe um único tema visual, sempre escuro, com estética neon-galáctica (fundo com nebulosa, estrelas cintilantes, partículas de luz e criaturinhas decorativas flutuando, brilho neon nas marcas/linhas/riscos, fontes Orbitron/Rajdhani). Os efeitos sonoros de jogada são sintetizados em tempo real via Web Audio (sem arquivo, sem rede), com dois timbres — um "blip" curto para a marca, um mini-acorde de duas notas para os riscos — no lugar das duas gravações antigas.

## 2. Referência da demanda

Spec local: [`.specs/NEON/spec.md`](spec.md). Projeto sem tracker externo (sem ClickUp/Jira/Linear).

Entrega: REQ-NEON-01 a 09, RN-NEON-01 a 04, AC-NEON-01 a 07 (tabela de rastreabilidade completa na seção 9 da spec).

## 3. Mudanças de dados

Sem alteração de schema/banco — o projeto usa só `localStorage`, sem migration formal.

Único efeito em dado existente: `Preferences.theme` (chave `stt.prefs` no `localStorage`) deixou de existir no tipo `Preferences` (`src/storage/persist.ts`). Uma entrada antiga que ainda tenha esse campo salvo fica órfã e é simplesmente ignorada — `loadPreferences()` já faz merge tolerante com `Partial<Preferences>`, o mesmo padrão usado em todo o arquivo para armazenamento indisponível/desatualizado. Não-destrutivo, sem necessidade de limpeza manual.

## 4. Fluxo de chamadas e integrações

**Som por jogada:**
```
App.tsx#applyPath / OnlineGame.tsx (snapshot recebido) / ReplayScreen.tsx (autoplay)
  → soundsForTransition(before, after)   [sem alteração — lógica pura em src/audio/events.ts]
  → playMoveSounds(sounds)                [alterado: perdeu o parâmetro `theme`]
    → getVoiceBuffer(ctx, voice)          [novo: substitui loadClip (fetch + decodeAudioData)]
      → synthesizeBuffer(ctx, voice)      [novo: gera AudioBuffer em memória, sem rede]
    → playTouch(ctx, event, start)        [alterado: agora síncrono, sem fetch a aguardar]
```
A fila serial (`reserveSlot`, `queueFreeAt`, `MIN_GAP_S`, `MAX_BACKLOG_S`) e a tabela `RATE` por evento (x/o/small/big) não mudaram de comportamento — só a origem do `AudioBuffer` mudou, de gravação carregada por rede para síntese em memória.

**Renderização do tema:**
```
App.tsx (render)
  → CosmicBackground                      [novo componente, src/ui/CosmicBackground.tsx]
  → themes.css (:root único)              [alterado: removidos os blocos [data-theme='light'/'dark']]
```

**Exportação de GIF:**
```
ReplayScreen.tsx#downloadEntryGif
  → generateGif(entry)                    [sem alteração de assinatura]
    → themePalette()                      [alterado: GifPalette perdeu o campo `ruled`]
    → drawState(ctx, state, palette)      [alterado: perdeu o parâmetro `jitter`]
      → drawGrid / drawStrikes            [alterados: traço reto + glow via ctx.shadowBlur, no lugar do handLine com tremido]
```

## 5. Validações aplicadas

- **RN-NEON-01:** síntese de som substitui só o timbre novo (blip/chime), revendo RN-SOM-03 (que vale pra imitação de som físico, giz/lápis) — motivo documentado no cabeçalho de `src/audio/sound.ts` e na seção 8 de `.specs/NEON/spec.md`.
- **RN-NEON-02:** `.cosmic-bg` e todos os seus filhos têm `pointer-events: none` (CSS, `src/ui/themes.css`) e o container tem `aria-hidden="true"` (`src/ui/CosmicBackground.tsx`) — garantido estruturalmente, não por lógica condicional em JS.
- **RN-SOM-04, 05, 07, 08, 10** (herdadas, sem alteração de comportamento): fila serial, descarte por atraso, pacote atômico por jogada, silêncio ao desfazer — mesma lógica de antes em `src/audio/sound.ts`, só a origem do buffer mudou.
- **RN-NEON-04:** animações decorativas novas (estrelas, partículas, criaturinhas) usam `@media (prefers-reduced-motion: reduce)` em `themes.css`, mesmo padrão já usado pela animação do risco (spec RISCO).

## 6. Possíveis impactos colaterais

- `OnlineGame.tsx` e `ReplayScreen.tsx` perderam a prop `theme` — sem consumidor externo a este repositório, então sem impacto fora dele.
- `GifPalette` (`src/replay/gif.ts`) perdeu o campo `ruled` — mesma observação, sem consumidor externo.
- `public/sounds/chalk.mp3` e `public/sounds/pencil.mp3` foram apagados do repositório; nada mais os referencia.
- `index.html`: o `<link>` de fontes do Google passou a carregar de forma não bloqueante (`media="print"` + `onload`, com fallback `<noscript>`). Melhoria de robustez geral, feita porque a troca de família de fonte já mexia nessa linha — evita que uma rede lenta/bloqueada pro Google Fonts trave o carregamento da página (foi o que causou instabilidade nos testes e2e neste ambiente sem acesso à internet; ver observação abaixo).
- **Suíte de testes:** `tests/e2e/persistence.spec.ts`, `sound.spec.ts`, `replay.spec.ts` e `local.spec.ts` foram atualizados pra refletir a ausência do alternador de tema e os novos valores de duração da animação do risco (`--strike-dur-small`/`--strike-dur-big`, agora `0.382s`/`0.553s`, recalculados a partir da nova duração-base do clipe sintetizado). Arquivo novo, `tests/e2e/neon.spec.ts`, cobre os critérios de aceite específicos desta spec (AC-NEON-01, 05, 06).
- **Nota de ambiente:** a suíte Playwright completa passa 44/44 em modo serial (`--workers=1`); com paralelismo alto neste sandbox específico (sem acesso à internet), pode haver flakiness pontual por contenção de recursos entre instâncias do Chromium — não observado em CI real (GitHub Actions tem acesso à internet e roda com configuração própria de workers).
