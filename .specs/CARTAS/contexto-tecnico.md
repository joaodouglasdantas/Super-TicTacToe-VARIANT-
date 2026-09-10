# Guia de Contexto Técnico — CARTAS

## 1. O que foi alterado

Uma partida deixa de ser só uma sequência de **jogadas** (`Move = {player, path}`); agora é uma sequência de **ações**, jogada normal ou jogada de carta, implementada como extensão do próprio `Move` (`card?`, `path2?`, `cellIndex?` opcionais) em vez de um novo tipo `Action` com `kind`. `GameState` ganhou `hands: Record<Player, CardId[]>` e `actionCount: number`, os dois sempre derivados do histórico (nunca fonte de verdade própria — `hands` nunca é persistido, é recomputado por `replay()`). `Board` ganhou `lockedUntilAction`/`protectedUntilAction`/`protectedBy`, comparados contra `actionCount`. O mapa da partida (`MapTheme`, antes só cosmético — spec MAPAS) virou parte de `GameConfig` (campo obrigatório) porque agora decide qual baralho está ativo, e deixou de ter uma cópia solta em `SavedMatch`/`SavedOnline`/`LibraryEntry` (uma única fonte, dentro de `config`). Pré-condição: o modo bot foi removido numa entrega anterior a esta.

## 2. Referência da demanda

Spec: `.specs/CARTAS/spec.md`.
Entrega: REQ-CARTAS-01 a 11, RN-CARTAS-01 a 07, AC-CARTAS-01 a 10.

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
```

## 5. Validações aplicadas

- REQ-CARTAS-02, 03: `grantIfNewlyWon` só dispara quando um tabuleiro de profundidade `depth-1` fecha com X ou O (nunca empate), e só a partir de placement (jogada normal, salto-estelar, estrela-da-sorte) — efeitos de carta que fecham um tabuleiro como consequência (ex.: correnteza completando uma linha) nunca concedem.
- REQ-CARTAS-05: `hands[winner].length >= 3` → carta nova é descartada silenciosamente (`grantIfNewlyWon` devolve `hands` inalterado).
- REQ-CARTAS-06: `applyCard` sempre marca `forcedPath` conforme a carta (nunca deixa marcar no mesmo turno); é uma ação completa, não um passo intermediário.
- REQ-CARTAS-07: nunca implementado como "campo oculto no protocolo" — o histórico sincronizado tem a mesma informação pros dois lados; a ocultação é só de UI (`CardHand` só nomeia `state.hands[viewerSymbol]`, mostra `state.hands[outro].length` pro resto).
- RN-CARTAS-01: `boardTargetable()` recusa tabuleiro já decidido (`resultOf(board, tiebreak) !== null`).
- RN-CARTAS-02: `isLocked(board, actionCount)` conta como indisponível tanto pra `allowedBoards()` (encaminhamento normal) quanto pra `boardTargetable()` (alvo de outra carta).
- RN-CARTAS-03: `isProtectedAgainst(board, actionCount, attacker)` só bloqueia o atacante que NÃO é `protectedBy` — o dono protegido pode jogar normalmente no próprio tabuleiro.
- RN-CARTAS-04: `lockedUntilAction`/`protectedUntilAction` são comparados contra `state.actionCount`, que incrementa em toda ação (jogada ou carta, de qualquer jogador, em qualquer tabuleiro) — nunca um contador por tabuleiro.
- RN-CARTAS-05: `validateCard` (caso `estrela-da-sorte`) exige os dois tabuleiros `boardTargetable` E a posição vazia nos dois; a UI (`starPositions`) só oferece posições com pelo menos 2 tabuleiros candidatos, então a carta nunca fica selecionável sem alvo válido.
- RN-CARTAS-06: `validateCard` recusa `partida-encerrada` e `fora-de-vez` antes de qualquer verificação específica de carta.
- RN-CARTAS-07: `cardMap(card) !== state.config.map` → `carta-de-outro-mapa`; nunca é possível ter na mão uma carta de mapa errado porque `drawCard` só sorteia dentro de `CARD_DECKS[state.config.map]`, mas a validação existe do mesmo jeito por defesa (histórico corrompido/import adulterado).

## 6. Possíveis impactos colaterais

- **`GameConfig.map` passou de "não existia no motor" pra campo obrigatório.** Todo teste e todo call-site que constrói um `GameConfig` literal precisou ganhar `map: 'galaxy'` (ou similar) — cerca de uma dúzia de arquivos de teste, mais `App.tsx`/`SetupScreen.tsx`. Conferido por `npm run typecheck` limpo.
- **`P2PMessage` (`'move'`) ganhou campos opcionais novos** (`card`, `path2`, `cellIndex`). Não subiu `PROTOCOL_VERSION` — mesma decisão já tomada na entrega MAPAS: o site é sempre servido na build mais recente do GitHub Pages, sem cliente antigo coexistindo.
- **Som de jogada de carta reaproveita `soundsForTransition` sem alteração** (compara contagem de linhas fechadas antes/depois). Pra cartas que removem marca (Buraco Negro) ou não marcam nada (Devorador, Bolha, Tempestade, Tsunami), o som de "marca" ainda toca anunciando quem jogou — não é tecnicamente uma marca nova, mas nenhum REQ desta spec pede som dedicado por carta (Fora do Escopo cobre "refinamento" em geral); fica como possível ajuste futuro, não bug desta entrega.
- **GIF exportado (`replay/gif.ts`) não foi alterado.** Continua desenhando só o tabuleiro; um quadro onde um tabuleiro está bloqueado/protegido não tem selo visual — a regra vale (célula realmente fica indisponível na partida ao vivo), só o GIF não destaca isso.
- **`allowedBoards()` e `playableLeafBoards()` ganharam parâmetro `actionCount` com default `Infinity`** (equivalente a "nada bloqueado") — qualquer chamador pré-existente que não passava esse argumento continua funcionando exatamente igual a antes.
- **Testes e2e** que dependem de um mapa/carta específicos usam o mesmo hook `stt.forceMap` já existente (spec MAPAS) — o sorteio de carta em si não precisou de hook próprio porque é função pura do número de jogadas já feitas (`actionCount`), então um roteiro de jogadas fixo já é determinístico.
