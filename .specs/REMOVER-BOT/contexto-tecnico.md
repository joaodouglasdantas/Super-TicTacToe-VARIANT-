# Guia de Contexto Técnico — REMOVER-BOT

## 1. O que foi alterado

Remoção completa do modo "Contra o bot": apagado `src/bot/` (motor de IA, minimax até 3 níveis) e toda referência a ele em UI, storage e i18n. Como consequência direta, o tipo `MatchMode` (que só existia pra distinguir `'local'` de `'bot'` numa partida local) foi eliminado — com só uma variante possível restando, o tipo não carregava mais informação nenhuma. `LibraryMode`/dado exportado perdem a variante `'bot'`, mas continuam com `'local' | 'online'` (online não foi tocado).

## 2. Referência da demanda

Spec: `.specs/REMOVER-BOT/spec.md`.
Entrega: REQ-REMOVERBOT-01 a 05, RN-REMOVERBOT-01, AC-REMOVERBOT-01 a 04.

## 3. Mudanças de dados

Sem banco — só `localStorage`, sem migration ativa. Não-destrutivo: dado antigo com `mode: 'bot'` (em `stt.match`, `stt.library`, `stt.prefs.lastMode` ou arquivo `.json` exportado) continua no armazenamento do usuário; só passa a ser **normalizado pra `'local'` na leitura**, nunca lido/exibido como `'bot'` de novo (ninguém consumia esse valor pra exibição antes, então não há mudança de comportamento visível).

```
src/replay/library.ts  listLibrary()   — normaliza mode: entry.mode === 'online' ? 'online' : 'local'
src/replay/exchange.ts parseImported() — normaliza mode: match.mode === 'online' ? 'online' : 'local'
```

`stt.prefs.lastMode` e `SavedMatch.mode` deixaram de existir como campos — não precisam de normalização porque `Preferences`/`SavedMatch` simplesmente não leem mais esse campo (o `read<Partial<Preferences>>` já ignora chaves desconhecidas).

## 4. Fluxo de chamadas e integrações

```
Home (SetupScreen)
  pickMode('local' | 'online')          [alterado: ModeType perdeu 'bot']
  confirmConfig → onStart(setup)         [alterado: MatchSetup sem campo `mode`]

App.startMatch                           [alterado: sem `mode` no Match; sem lastMode nas prefs]
App.handleHumanMove                      [alterado: sem checagem de vez do bot]
App.useEffect (jogada do bot)            [removido por inteiro]
App.handleUndo                           [alterado: sempre desfaz 1 jogada, não mais par]
App.handleResume / App.matchEntry        [alterado: sem `mode`/`m.mode.type`]
App.displayNames                         [removido — GameScreen usa match.playerNames direto]

src/storage/persist.ts   MatchMode        [removido]
                          Preferences.lastMode [removido]
                          SavedMatch.mode  [removido]
src/replay/library.ts    LibraryMode      [alterado: 'local' | 'bot' | 'online' → 'local' | 'online']
src/replay/exchange.ts   parseImported    [alterado: normalização sem 'bot']
src/ui/icons.tsx         IconBot          [removido, sem consumidor]
src/i18n/index.ts        botMode, difficulty, diffEasy/Medium/Hard, botName, onePlayer [removidos, pt+en]
                          infoDescription  [reescrito, sem menção a bot]
```

`src/engine/` **não foi tocado** — o bot só consumia a API pública dele (`chooseMove` chamava `applyMove`/`validateMove`/etc.), nunca teve dependência na direção contrária. `undo(state, count)` continua aceitando um `count` opcional (usado hoje só com o padrão 1, mas é capacidade genérica do motor, não específica de bot — mantida e ainda coberta por teste unitário, só com a descrição reescrita pra não citar bot).

## 5. Validações aplicadas

- REQ-REMOVERBOT-03: leitura de biblioteca e importação de arquivo normalizam qualquer `mode` desconhecido/antigo pra `'local'` — nunca deixam passar um valor fora do union atual.
- Sem validação nova de regra de jogo — nenhuma mudança em `src/engine/`.

## 6. Possíveis impactos colaterais

- **Layout da home**: "2 jogadores" deixou de estar pareado com "1 jogador" (`.modes-pair`, removida do CSS por ficar sem uso) e virou botão de largura cheia, empilhado com "Criar sala" em `.modes-stack`. Conferido visualmente, sem quebra de responsividade (mesma classe `.mode-btn`/`--mode-h` de sempre).
- **`tests/e2e/menu.spec.ts`**: teste que verificava os "três modos em 1x2" foi reescrito pra confirmar a ausência do botão bot em vez de sua presença.
- **`tests/engine/game.test.ts`**: teste de `undo(state, 2)` mantido (motor ainda suporta desfazer N jogadas), só perdeu a menção a "modo bot" na descrição — o comportamento testado não mudou.
- **Comentários históricos não tocados**: `src/audio/sound.ts` (fila serial) e `tests/e2e/sound.spec.ts` ainda mencionam "bot" em comentários explicando a motivação original do mecanismo (jogada do bot chegando rápido demais). O mecanismo em si é genérico e continua correto sem bot; os comentários não foram reescritos por serem só contexto histórico, não código — decisão deliberada, não é esquecimento.
- **`vite.config.ts`**: `testTimeout: 60_000` tinha comentário citando "bot contra bot no nível difícil" como motivo do timeout generoso. Não foi reduzido (outros testes podem se beneficiar da folga, e não há necessidade funcional de mudar) — só registrado aqui que o motivo original não existe mais.
- **`.specs/ESTAT/spec.md`** (feature futura, não implementada): recebeu nota de atenção — vários requisitos citam o bot; precisa de revisão antes de ser implementada, não foi tocada além da nota.
- **Specs históricas não tocadas** (`OFFLINE`, `CONEXAO`, `REPLAY`, `SOM`, `REPLAY2`, `RISCO`, `MAPAS`, `MENU`): continuam mencionando o bot como fazia parte do escopo quando foram escritas/entregues — decisão deliberada (RN-REMOVERBOT-01), documentado na spec.
