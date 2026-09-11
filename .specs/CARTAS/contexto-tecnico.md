# Guia de Contexto Técnico — CARTAS

## 1. O que foi alterado

Uma partida deixa de ser só uma sequência de **jogadas** (`Move = {player, path}`); agora é uma sequência de **ações**, jogada normal ou jogada de carta, implementada como extensão do próprio `Move` (`card?`, `path2?`, `cellIndex?` opcionais) em vez de um novo tipo `Action` com `kind`. `GameState` ganhou `hands: Record<Player, CardId[]>` e `actionCount: number`, os dois sempre derivados do histórico (nunca fonte de verdade própria — `hands` nunca é persistido, é recomputado por `replay()`). `Board` ganhou `lockedUntilAction`/`protectedUntilAction`/`protectedBy`, comparados contra `actionCount`. O mapa da partida (`MapTheme`, antes só cosmético — spec MAPAS) virou parte de `GameConfig` (campo obrigatório) porque agora decide qual baralho está ativo, e deixou de ter uma cópia solta em `SavedMatch`/`SavedOnline`/`LibraryEntry` (uma única fonte, dentro de `config`). Pré-condição: o modo bot foi removido numa entrega anterior a esta.

**v2 (revisão pós-teste do usuário no site publicado):** três mudanças, nenhuma delas exigiu tocar a garantia central (`{config, moves}` reduzido por replay) de novo. (1) Bolha de Proteção virou escudo total: `isProtectedAgainst` migrou de `game.ts` pra `board.ts` e passou a ser checada também em `allowedBoards()` (jogada normal), não só em `validateCard` (carta). (2) Duas cartas novas, Supernova (galáxia) e Maré Virada (praia), miram um tabuleiro **decidido** em vez de aberto — exceção nova via `decidedBoardTargetable()`, irmã de `boardTargetable()`. (3) `CardHand.tsx` trocou o `<select>` nativo por uma grade 3x3 de botões (`GridPicker`) — muda só a apresentação do alvo, a validação continua 100% em `validateCard`.

## 2. Referência da demanda

Spec: `.specs/CARTAS/spec.md`.
Entrega: REQ-CARTAS-01 a 11, RN-CARTAS-01 a 07, AC-CARTAS-01 a 10.
Entrega v2: REQ-CARTAS-12, 13; RN-CARTAS-03 (revisada), RN-CARTAS-08; AC-CARTAS-06 (revisado), 11, 12, 13.

## 3. Mudanças de dados

Sem banco — tudo em `localStorage`, mesmo padrão defensivo já usado pra `mode`/`map` (specs STT/MAPAS): campo ausente cai num fallback.

```
stt.match (SavedMatch)      — campo solto `map` REMOVIDO (agora só existe dentro de `game.config.map`)
stt.p2p   (SavedOnline)     — campo solto `map` REMOVIDO (idem, dentro de `config.map`)
stt.library (LibraryEntry)  — campo solto `map` REMOVIDO (idem)
arquivo .json exportado     — idem; `parseImported` normaliza `config.map` ANTES de chamar `replay()`
                               (drawCard() explode em CARD_DECKS[undefined] se chamado com map
                               ausente — a normalização precisa vir antes da validação por replay,
                               não depois)
```

`hands`/`actionCount` nunca são persistidos: só `{config, moves}` (via `serialize()`), sempre recomputados por `replay()`. Não-destrutivo: partida salva antes desta entrega não tem jogada de carta no histórico, então recomputa mãos vazias sem erro.

## 4. Fluxo de chamadas e integrações

```
Vencer um tabuleiro pequeno (jogada normal ou salto-estelar/estrela-da-sorte)
  engine/game.ts#applyMove ou #applyCard                [alterado: chama grantIfNewlyWon]
  engine/game.ts#grantIfNewlyWon                         [novo: só placement concede, nunca efeito]
  engine/cards.ts#drawCard(map, seed=actionCount antes)   [novo: mulberry32 determinístico, 60/30/10]

Jogar uma carta (local)
  ui/CardHand.tsx (seleciona carta + alvo, via ui/cardTargets.ts)   [novo]
  ui/App.tsx#handlePlayCard                              [novo: chama engine/game.ts#applyCard]
  engine/game.ts#validateCard → #applyCard                [novo]
  ui/App.tsx#commitNewState (mesmo caminho de applyPath: som, placar, biblioteca, persistência) [alterado: extraído de applyPath pra ser reusado]

Jogar uma carta (online)
  ui/CardHand.tsx → OnlineGame.tsx#handlePlayCard          [novo]
  p2p/session.ts#P2PSession.playCard                       [novo: valida local, aplica, envia 'move' com card/path2/cellIndex]
  p2p/protocol.ts ('move')                                 [alterado: ganha card?/path2?/cellIndex? opcionais]
  p2p/session.ts#onMove (lado que recebe)                   [alterado: reconstrói Move completo, valida com validateCard quando move.card existe, aplica via applyAction]

Replay / undo / resume / GIF (qualquer histórico misto de jogada+carta)
  engine/game.ts#replay                                    [alterado: usa applyAction em vez de applyMove]
  engine/game.ts#applyAction(state, move)                   [novo: move.card ? applyCard : applyMove — ponto único]
  engine/game.ts#undo                                       [sem alteração de assinatura — ganha o comportamento novo de graça, por já reconstruir via replay/applyAction]
  replay/gif.ts#buildFrames                                 [sem alteração — já usa replay()]

Consolidação de `map` (pré-requisito técnico desta entrega, não um REQ em si)
  engine/types.ts#GameConfig.map                            [alterado: de opcional/externo pra obrigatório dentro de GameConfig]
  storage/persist.ts, replay/library.ts, replay/exchange.ts  [alterado: removido campo solto `map`, lido de `config.map` com normalizeMap()]
  p2p/protocol.ts ('config'/'sync'), p2p/session.ts          [alterado: idem — `this.map` removido, sempre `this.config.map`]
  ui/OnlineGame.tsx, ui/App.tsx                              [alterado: `snap.map` → `snap.state.config.map`]

Mão de cartas (UI)
  ui/GameScreen.tsx (novo prop `viewerSymbol`)               [alterado: decide qual mão é nomeada nesta tela]
  ui/CardHand.tsx                                            [novo: mão + painel de alvo por carta]
  ui/cardTargets.ts                                          [novo: todo alvo válido é perguntado a validateCard, nunca reimplementado na UI]
  ui/cardMeta.ts, ui/icons.tsx                                [novo: nome/descrição/raridade/ícone por CardId]
  ui/moveHistory.ts                                          [novo: describeMove — histórico distingue jogada normal de jogada de carta]

Bolha de Proteção bloquear jogada normal (v2)
  engine/board.ts#isProtectedAgainst                         [movida de game.ts pra cá, ganhou blockedFor? opcional]
  engine/board.ts#isPlayablePath / #playableLeafBoards         [alterado: novo parâmetro blockedFor?, exclui tabuleiro protegido contra ele]
  engine/game.ts#allowedBoards                                [alterado: passa state.currentPlayer como blockedFor]

Supernova / Maré Virada (v2) — jogar carta em tabuleiro DECIDIDO
  engine/game.ts#decidedBoardTargetable                       [novo: irmã de boardTargetable, inverte a exigência de resultOf]
  engine/game.ts#validateCard / #applyCard (casos supernova/mare-virada) [novo]
  engine/cards.ts#CARD_DECKS                                  [alterado: 5ª carta épica por mapa]
  ui/cardTargets.ts#shapeOf                                    [alterado: as duas entram em BOARD_ONLY, mesmo fluxo de UI dos outros 4 "board"]

Grade 3x3 de alvo (v2, troca o <select>)
  ui/CardHand.tsx#GridPicker                                  [novo: grade de 9 botões, reusada pra tabuleiro/célula/posição]
  ui/themes.css (.target-grid, .target-cell)                  [novo: visual — borda neon, glow no hover/selecionado, tracejado quando inválido]
```

## 5. Validações aplicadas

- REQ-CARTAS-02, 03: `grantIfNewlyWon` só dispara quando um tabuleiro de profundidade `depth-1` fecha com X ou O (nunca empate), e só a partir de placement (jogada normal, salto-estelar, estrela-da-sorte) — efeitos de carta que fecham um tabuleiro como consequência (ex.: correnteza completando uma linha) nunca concedem.
- REQ-CARTAS-05: `hands[winner].length >= 3` → carta nova é descartada silenciosamente (`grantIfNewlyWon` devolve `hands` inalterado).
- REQ-CARTAS-06: `applyCard` sempre marca `forcedPath` conforme a carta (nunca deixa marcar no mesmo turno); é uma ação completa, não um passo intermediário.
- REQ-CARTAS-07: nunca implementado como "campo oculto no protocolo" — o histórico sincronizado tem a mesma informação pros dois lados; a ocultação é só de UI (`CardHand` só nomeia `state.hands[viewerSymbol]`, mostra `state.hands[outro].length` pro resto).
- RN-CARTAS-01: `boardTargetable()` recusa tabuleiro já decidido (`resultOf(board, tiebreak) !== null`). Exceção (v2, RN-CARTAS-08): `decidedBoardTargetable()` faz o inverso — recusa tabuleiro AINDA aberto — só pra Supernova/Maré Virada.
- RN-CARTAS-02: `isLocked(board, actionCount)` conta como indisponível tanto pra `allowedBoards()` (encaminhamento normal) quanto pra `boardTargetable()`/`decidedBoardTargetable()` (alvo de carta).
- RN-CARTAS-03 (v2, escudo total): `isProtectedAgainst(board, actionCount, blockedFor?)` só bloqueia quem NÃO é `protectedBy` — o dono protegido joga normalmente e mira com a própria carta. Antes só entrava em `boardTargetable()` (carta); agora `allowedBoards()` também passa por ela (`blockedFor = state.currentPlayer`), então jogada normal do adversário é bloqueada igual.
- RN-CARTAS-04: `lockedUntilAction`/`protectedUntilAction` são comparados contra `state.actionCount`, que incrementa em toda ação (jogada ou carta, de qualquer jogador, em qualquer tabuleiro) — nunca um contador por tabuleiro.
- RN-CARTAS-05: `validateCard` (caso `estrela-da-sorte`) exige os dois tabuleiros `boardTargetable` E a posição vazia nos dois; a UI (`starPositions`) só oferece posições com pelo menos 2 tabuleiros candidatos, então a carta nunca fica selecionável sem alvo válido.
- RN-CARTAS-06: `validateCard` recusa `partida-encerrada` e `fora-de-vez` antes de qualquer verificação específica de carta.
- RN-CARTAS-07: `cardMap(card) !== state.config.map` → `carta-de-outro-mapa`; nunca é possível ter na mão uma carta de mapa errado porque `drawCard` só sorteia dentro de `CARD_DECKS[state.config.map]`, mas a validação existe do mesmo jeito por defesa (histórico corrompido/import adulterado).
- RN-CARTAS-08 (v2): Maré Virada soma uma checagem além de `decidedBoardTargetable`: `resultOf(board, tiebreak) === otherPlayer(move.player)` — só rouba vitória do adversário, nunca a própria nem um empate (`AC-CARTAS-13`). Supernova não tem essa checagem extra: qualquer resultado decidido (X, O, ou empate) é alvo válido.

## 6. Possíveis impactos colaterais

- **`GameConfig.map` passou de "não existia no motor" pra campo obrigatório.** Todo teste e todo call-site que constrói um `GameConfig` literal precisou ganhar `map: 'galaxy'` (ou similar) — cerca de uma dúzia de arquivos de teste, mais `App.tsx`/`SetupScreen.tsx`. Conferido por `npm run typecheck` limpo.
- **`P2PMessage` (`'move'`) ganhou campos opcionais novos** (`card`, `path2`, `cellIndex`). Não subiu `PROTOCOL_VERSION` — mesma decisão já tomada na entrega MAPAS: o site é sempre servido na build mais recente do GitHub Pages, sem cliente antigo coexistindo.
- **Som de jogada de carta reaproveita `soundsForTransition` sem alteração** (compara contagem de linhas fechadas antes/depois). Pra cartas que removem marca (Buraco Negro) ou não marcam nada (Devorador, Bolha, Tempestade, Tsunami), o som de "marca" ainda toca anunciando quem jogou — não é tecnicamente uma marca nova, mas nenhum REQ desta spec pede som dedicado por carta (Fora do Escopo cobre "refinamento" em geral); fica como possível ajuste futuro, não bug desta entrega.
- **GIF exportado (`replay/gif.ts`) não foi alterado.** Continua desenhando só o tabuleiro; um quadro onde um tabuleiro está bloqueado/protegido não tem selo visual — a regra vale (célula realmente fica indisponível na partida ao vivo), só o GIF não destaca isso.
- **`allowedBoards()` e `playableLeafBoards()` ganharam parâmetro `actionCount` com default `Infinity`** (equivalente a "nada bloqueado") — qualquer chamador pré-existente que não passava esse argumento continua funcionando exatamente igual a antes.
- **Testes e2e** que dependem de um mapa/carta específicos usam o mesmo hook `stt.forceMap` já existente (spec MAPAS) — o sorteio de carta em si não precisou de hook próprio porque é função pura do número de jogadas já feitas (`actionCount`), então um roteiro de jogadas fixo já é determinístico.

### Impactos da v2

- **`CARD_DECKS` foi de 4 pra 5 cartas por mapa.** A raridade épica (10% de sorteio) agora se divide entre 2 cartas (5% cada) — `drawCard()` já era genérico o bastante (`pool[Math.floor(rand() * pool.length)]`) pra não precisar de nenhuma mudança de lógica, só o dado (`CARD_DECKS`) cresceu. Conferido que os seeds já usados em testes/e2e existentes (ex. seed 4 → Devorador de Tabuleiro/Tsunami) continuam dando a mesma carta depois da mudança — o segundo sorteio (`rand()` dentro da raridade) calhou de continuar caindo no índice 0 do pool pra esses seeds específicos; **não é garantia geral**, só verificado caso a caso pros seeds que os testes atuais usam.
- **`tests/e2e/cards.spec.ts` precisou de ajuste**, não por regressão, mas porque a interação mudou de verdade: `page.getByTestId('target-board').selectOption(...)` (v1, `<select>`) virou `page.getByTestId('target-board-{i}').click()` (v2, grade de botões). Qualquer outro teste/script que dependa do `<select>` antigo (nenhum encontrado além desse) precisaria do mesmo ajuste.
- **`isProtectedAgainst` mudou de assinatura ao migrar pra `board.ts`**: o terceiro parâmetro passou de obrigatório (`attacker: Player`) pra opcional (`blockedFor?: Player`), porque agora é chamada em dois contextos — carta (sempre passa o jogador) e jogada normal via `allowedBoards()` (também sempre passa `state.currentPlayer`, então na prática nunca fica `undefined` em uso real; o opcional existe só pra deixar claro que "uso sem cartas em jogo" nunca bloqueia ninguém).
- **Nenhuma mudança em `replay/gif.ts`, `p2p/protocol.ts` ou `p2p/session.ts`** pela v2: Supernova/Maré Virada são só mais dois `CardId`, sincronizados pelo mesmo `'move'` com `card`/`path` já existente; o bloqueio de jogada normal por proteção também não precisou de mensagem nova (`allowedBoards()` já roda igual dos dois lados a partir do mesmo `state.currentPlayer`/`actionCount` sincronizados).
