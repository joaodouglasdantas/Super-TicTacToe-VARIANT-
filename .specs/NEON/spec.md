# NEON: Redesign visual e sonoro — tema neon-galáctico

## 1. História de Usuário

**Como** dono deste fork do jogo, **Quero** trocar a identidade visual "caderno/lousa" por um tema neon-galáctico único (fundo escuro, estrelas, partículas de luz, brilho neon, criaturinhas decorativas) com sons de jogada sintetizados e satisfatórios, **Para que** o jogo publicado no meu GitHub Pages tenha a minha cara, não a identidade original do projeto de onde fiz o fork.

## 2. Contexto do Problema

O jogo veio de um fork já pronto, com identidade visual "papel pautado / quadro-negro de giz" (spec [[STT]]): traço tremido de caneta/giz (filtro SVG `squiggle`), fontes cursivas (Patrick Hand, Caveat), alternância entre tema claro ("Caderno") e escuro ("Lousa"), e efeitos sonoros de jogada a partir de gravações reais de giz/lápis (spec [[SOM]]). O dono deste fork não se identifica com essa estética e quer uma identidade nova: neon/galáctica, fundo sempre escuro, com estrelas, partículas de luz, brilho nas marcas e linhas, fontes futuristas, criaturas espaciais decorativas, e sons de jogada com timbre synth/lofi satisfatório em vez de giz/lápis.

Decisões fechadas com o usuário antes deste documento (via perguntas de esclarecimento):

1. Tema único, sempre escuro — remove a alternância claro/escuro por completo (não vira uma terceira opção, substitui as duas).
2. Redesign completo, não só recolorir: sai o traço tremido, as linhas de caderno e as fontes cursivas; entram fundo animado com estrelas/partículas, brilho (glow) nas marcas e linhas do tabuleiro, e fontes futuristas.
3. Escopo de som: só os efeitos de jogada trocam de timbre. Música de fundo contínua fica fora desta entrega.
4. Criaturinhas decorativas flutuando pelo fundo, só visual, sem interação.
5. Os novos efeitos de jogada são **sintetizados por código** (Web Audio), não gravações — ver Notas Técnicas sobre por que isso é diferente da tentativa de síntese já rejeitada no passado.

## 3. Dependências

- Spec [[STT]] (motor de jogo, temas caderno/lousa originais) — este documento substitui a parte de tema, não o motor.
- Spec [[SOM]] (sons de jogada) — este documento revê RN-SOM-03 (ver Regras de Negócio).
- Spec [[RISCO]] (risco animado na linha vencedora) — mantido, só o visual do traço muda.
- Spec [[REPLAY2]] (GIF exportado da partida) — o GIF passa a usar a nova paleta/tipografia.

## 4. Requisitos

- **REQ-NEON-01:** O jogo **deve** ter um único tema visual, sempre escuro, com estética neon-galáctica (fundo escuro, estrelas, brilho neon), substituindo por completo os temas caderno/lousa e a alternância entre eles.
- **REQ-NEON-02:** O fundo **deve** ter um céu estrelado (estrelas cintilando) e partículas de luz flutuantes, dando sensação de profundidade espacial, atrás do conteúdo do jogo.
- **REQ-NEON-03:** Marcas X e O, linhas do tabuleiro e riscos de vitória **devem** ter efeito de brilho (glow) nas cores neon do tema.
- **REQ-NEON-04:** A tipografia **deve** trocar as fontes cursivas (Patrick Hand, Caveat) por fontes de identidade futurista, mantendo legibilidade em todos os tamanhos de texto usados hoje.
- **REQ-NEON-05:** O traço tremido de giz/lápis (filtro `squiggle`) e as linhas de caderno de fundo **devem** ser removidos, junto com qualquer texto/rótulo que mencione "caderno"/"lousa".
- **REQ-NEON-06:** Pequenas criaturas/aliens decorativos **devem** flutuar lentamente pelo fundo, sem interação e sem interceptar clique/toque destinado ao tabuleiro ou aos controles.
- **REQ-NEON-07:** Os efeitos sonoros de jogada (marca X, marca O, risco pequeno, risco grande) **devem** trocar de gravações reais (giz/lápis) para sons sintetizados via Web Audio, com timbre suave e satisfatório ("lofi"), preservando a fila serial e as regras de não sobreposição já existentes (RN-SOM-04, 05, 07, 08, 10).
- **REQ-NEON-08:** O GIF exportado da partida (spec [[REPLAY2]]) **deve** refletir a nova paleta neon e a nova tipografia, sem o tremor de traço à mão.
- **REQ-NEON-09:** Preferências, textos e testes (i18n pt/en) relacionados a tema claro/escuro e a créditos de gravação de som **devem** ser removidos, já que deixam de existir.

## 5. Regras de Negócio

- **RN-NEON-01 (revê RN-SOM-03):** a regra de usar gravação real em vez de síntese, definida para o som de giz/lápis, não se aplica ao novo timbre. Lá o alvo era imitar um som físico (fenômeno *stick-slip* do giz), e três tentativas de síntese fracassaram nisso (ver `.specs/SOM/spec.md`, seção 8). Aqui o alvo é um timbre nativamente eletrônico (blip/chime synth), o tipo de som que já nasce sintetizado em qualquer jogo — não há "gravação real" de um blip sci-fi. Síntese por código é a abordagem natural neste caso, sem custo de licenciamento nem arquivo extra.
- **RN-NEON-02:** elementos decorativos (estrelas, partículas, criaturas) nunca capturam clique, toque ou foco de teclado (`pointer-events: none`), e ficam ocultos de leitor de tela (`aria-hidden`), pra não interferir na jogabilidade nem na acessibilidade.
- **RN-NEON-03:** a troca de tema e som é só visual/sonora — nenhuma regra de jogo, persistência de partida, replay ou conexão online muda de comportamento.
- **RN-NEON-04:** animações decorativas novas (estrelas, partículas, criaturas, cintilação) respeitam `prefers-reduced-motion`, no mesmo espírito já aplicado à animação do risco (spec [[RISCO]]).

## 6. Critérios de Aceite

- **AC-NEON-01:** Dado que o app carrega, quando a tela de configurações abre, então não existe mais alternador claro/escuro (nenhum elemento `theme-toggle`) nem textos "Caderno"/"Lousa".
- **AC-NEON-02:** Dado que uma partida está em andamento, quando uma marca X, marca O, risco pequeno ou risco grande acontece, então um som sintetizado toca, sem nenhuma requisição de rede para `/sounds/`.
- **AC-NEON-03:** Dado que uma jogada é desfeita, então nenhum som novo é disparado (mantém RN-SOM-05, cobertura equivalente à existente).
- **AC-NEON-04:** Dado o modal de informações aberto, quando não há mais crédito de gravação de terceiros a exibir, então a seção de créditos de som não aparece mais no modal.
- **AC-NEON-05:** Dado o novo fundo decorativo (estrelas/partículas/criaturas), quando o usuário clica em qualquer célula do tabuleiro ou botão da interface, então o clique sempre chega ao elemento funcional (nada intercepta — verificado por `pointer-events: none` computado no elemento decorativo).
- **AC-NEON-06:** Dado `prefers-reduced-motion: reduce`, quando a página carrega, então as animações decorativas contínuas (cintilação, flutuação) ficam paradas ou reduzidas ao mínimo.
- **AC-NEON-07:** A suíte de testes completa (`npm test` e `npm run test:ui`) passa depois da mudança, com os testes que dependiam do alternador de tema atualizados para o cenário de tema único.

## 7. Fora do Escopo

- Música de fundo (loop lofi contínuo durante a partida) — fica para uma entrega futura.
- Redesenho do favicon/ícone do site.
- Qualquer mudança de regra de jogo, bot, conexão P2P ou fluxo de telas (menu, setup, biblioteca) além da troca de estilo visual/sonoro.
- Novo conteúdo textual/idiomas além dos ajustes de rótulo já cobertos em REQ-NEON-09.
- Efeitos sonoros para ações de interface (abrir menu, trocar configuração) — continuam silenciosas (RN-SOM-02, mantida).

## 8. Notas Técnicas

### Por que sintetizar desta vez, ao contrário da decisão de 2026-09-03

A spec [[SOM]] documenta três tentativas de síntese rejeitadas para o som de giz/lápis, e uma pesquisa que não encontrou nenhum projeto sintetizando aquele som específico — o guincho do giz é um fenômeno físico (*stick-slip*) difícil de emular por osciladores. O caso aqui é diferente por natureza: o alvo agora é um blip/chime curto, característico de interface eletrônica — esse tipo de som **é** sintetizado por definição em praticamente todo software (não existe "gravação real" de um blip de nave espacial). RN-SOM-03 é revista só para este novo timbre; a lição de "síntese pode decepcionar no primeiro resultado" continua valendo, e o timbre final passa por escuta manual antes de fechar (mesmo processo de validação usado em SOM).

### Arquitetura de som (`src/audio/sound.ts`)

- Mantém a fila serial (`queueFreeAt`, `MIN_GAP_S`, `MAX_BACKLOG_S`, `reserveSlot`) e a tabela de taxa de reprodução por evento (`x`, `o`, `small`, `big`) intactas — é o que já garante RN-SOM-05/07/08/10.
- Troca o eixo `Theme` (`light`/`dark`, um clipe MP3 por tema, carregado por `fetch`+`decodeAudioData`) pelo eixo `Voice` (`move`/`strike`, um `AudioBuffer` sintetizado em memória por voz, sem rede). `x` e `o` usam a voz `move` (blip curto e redondo); `small` e `big` usam a voz `strike` (mini-acorde ascendente de duas notas, mais quente e "satisfatório" que um bipe seco).
- Cada voz é sintetizada uma vez por `AudioContext` (cache por sample rate, mesmo padrão de cache do `loadClip` atual) preenchendo um `AudioBuffer` com envelope de amplitude (ataque rápido, decaimento suave) — sem necessidade de rede, arquivo ou licença.
- `--strike-dur-small`/`--strike-dur-big` em `themes.css` continuam calculadas a partir da duração efetiva do clipe de voz `strike` dividida pela taxa de cada evento, mesmo acoplamento documentado hoje — os valores numéricos mudam porque a duração-base do clipe sintetizado é diferente da gravação antiga (teste `local.spec.ts` recebe os novos valores).
- `playMoveSounds` perde o parâmetro `theme` (não existe mais eixo de tema); `App.tsx`, `OnlineGame.tsx` e `ReplayScreen.tsx` param de repassar essa prop.

### Visual (`src/ui/themes.css`, `src/ui/App.tsx`, novo `src/ui/CosmicBackground.tsx`)

- `themes.css` perde os blocos `[data-theme='light']`/`[data-theme='dark']`; sobra um `:root` só, com paleta neon (fundo quase preto/índigo, `--mark-x` magenta, `--mark-o` ciano, `--accent`/`--line` em violeta, painéis translúcidos com leve `backdrop-filter: blur()`).
- Remove `filter: url(#squiggle)` do `.macro-board` e a definição do filtro SVG em `App.tsx`; remove o `background-image` de linhas de caderno do `body`.
- Fontes: troca `Patrick Hand`/`Caveat` por uma fonte de título futurista (títulos, resultado do tabuleiro) e uma fonte de corpo tecnológica mais legível (botões, texto corrido); mantém `JetBrains Mono` pro código de sala, que já combina.
- Novo componente `CosmicBackground` (camada `position: fixed; inset: 0; pointer-events: none; aria-hidden`, atrás do conteúdo): estrelas cintilantes, partículas de luz flutuantes e 3-4 criaturinhas/aliens em SVG próprio (sem asset externo, sem questão de licença), todos animados por CSS e suprimidos/reduzidos sob `prefers-reduced-motion`.

### GIF (`src/replay/gif.ts`)

- `themePalette()` já lê as variáveis CSS atuais (`--bg`, `--line`, `--mark-x`, etc.) sem hardcode de tema — continua funcionando sozinha com a nova paleta, só os valores de fallback mudam.
- `handLine` (tremor à mão) é substituída por traço reto com glow (`ctx.shadowColor`/`shadowBlur`), pra bater com o board na tela.
- Fontes do canvas (`ensureFonts`, `cellFont`, `bigFont`) trocam de `Patrick Hand`/`Caveat` pra fonte de título nova.

### Preferências e i18n

- `ThemePreference`/campo `theme` somem de `Preferences` (`src/storage/persist.ts`); entradas antigas de `localStorage` com esse campo são ignoradas sem erro (comportamento padrão do `read<T>` tolerante a campo desconhecido).
- `msgs.theme`/`themeLight`/`themeDark` somem do i18n pt/en; `msgs.soundCredits`/`infoSoundCreditsTitle` e a seção correspondente no modal de informações somem (não há mais gravação de terceiro a atribuir).

## 9. Rastreabilidade

| Código | Implementação | Verificação |
|---|---|---|
| REQ-NEON-01 | `src/ui/themes.css` (remove `[data-theme]`), `src/ui/App.tsx` (remove estado/toggle de tema), `src/storage/persist.ts` (remove `ThemePreference`) | `tests/e2e/persistence.spec.ts`, `tests/e2e/menu.spec.ts` (ausência do toggle) |
| REQ-NEON-02 | `src/ui/CosmicBackground.tsx` (novo), estilos em `themes.css` | inspeção visual (guia de validação) + `AC-NEON-06` |
| REQ-NEON-03 | `src/ui/themes.css` (glow em `.mark-X/.mark-O/.strike/.board-grid`) | inspeção visual (guia de validação) |
| REQ-NEON-04 | `index.html` (fontes), `src/ui/themes.css` (`--font-title`/`--font-body`) | inspeção visual (guia de validação) |
| REQ-NEON-05 | `src/ui/App.tsx` (remove filtro squiggle), `src/ui/themes.css` (remove linhas de caderno) | inspeção visual + `grep` por "squiggle"/"caderno"/"lousa" |
| REQ-NEON-06 | `src/ui/CosmicBackground.tsx` | `AC-NEON-05` (novo teste e2e) |
| REQ-NEON-07 | `src/audio/sound.ts` (voz sintetizada) | `tests/e2e/sound.spec.ts` (reescrito) |
| REQ-NEON-08 | `src/replay/gif.ts` | `tests/e2e/replay.spec.ts` (teste do GIF reescrito) |
| REQ-NEON-09 | `src/i18n/index.ts`, `src/ui/App.tsx` | `tests/e2e/sound.spec.ts` (teste de créditos removido/atualizado) |
| RN-NEON-01 | `src/audio/sound.ts` + esta seção de notas técnicas | revisão de código |
| RN-NEON-02 | `src/ui/CosmicBackground.tsx` (CSS `pointer-events: none`, `aria-hidden`) | `AC-NEON-05` |
| RN-NEON-03 | (nenhuma mudança fora de UI/áudio) | suíte existente de engine/bot/p2p continua verde sem alteração |
| RN-NEON-04 | `src/ui/themes.css` (`@media (prefers-reduced-motion: reduce)`) | `AC-NEON-06` |
| AC-NEON-01..07 | ver REQ correspondentes acima | testes citados na coluna anterior |
