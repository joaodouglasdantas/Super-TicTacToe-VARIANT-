# CARTAS: Cartas de evento por mapa

## 1. História de Usuário

**Como** jogador, **Quero** ganhar cartas de evento do mapa em que estou jogando ao vencer tabuleiros pequenos, e escolher quando usá-las, **Para que** cada partida tenha reviravoltas táticas além das regras clássicas do Super TicTacToe, e cada mapa tenha uma identidade própria não só visual, mas também de jogo.

## 2. Contexto do Problema

O jogo hoje (specs [[STT]], [[MAPAS]]) é puramente determinístico nas regras: quem joga melhor as jogadas clássicas vence. A spec [[MAPAS]] deu a cada partida um mapa visual sorteado (galáxia, praia), mas sem nenhum efeito de jogo — é só roupagem. Esta spec dá a cada mapa seu próprio baralho de cartas, que alteram o tabuleiro de formas específicas do tema (buraco negro engole marca, maré vira jogo), sorteadas conforme o jogador avança na partida.

Esta spec foi construída interativamente com o usuário (skill `formular-spec`), a partir de três ideias soltas dele pro mapa galáxia e nenhuma pra praia — as mecânicas de praia foram desenhadas nesta conversa, com aprovação dele.

**Pré-condição combinada:** o modo "Contra o bot" é removido do jogo (bot não foi desenhado pra decidir cartas, e ensinar isso é fora de escopo) — entrega separada, **anterior** a esta (ver Dependências).

**Revisão pós-entrega (v2):** depois da entrega original (8 cartas, 4 por mapa) ir ao ar, o usuário testou ao vivo e trouxe feedback que virou esta revisão: (1) Bolha de Proteção só bloqueava carta do adversário, não jogada normal — ele achou pouco (RN-CARTAS-03 mudou pra escudo total); (2) pediu revisão de todas as 8 cartas (nenhum bug de efeito encontrado — só o comportamento (1), que era a spec original mesmo); (3) pediu o seletor de alvo mais temático (trocado de `<select>` nativo pra uma grade 3x3, mesma linguagem visual do tabuleiro); (4) pediu uma 5ª carta por mapa, com o mesmo "intuito" nos dois (desfazer um tabuleiro já decidido) mas efeito diferente por tema — ver REQ-CARTAS-12/13.

## 3. Dependências

- Spec [[STT]]: motor de regras clássico, `allowedBoards` (regra de encaminhamento) — as cartas estendem esse mecanismo, não o substituem.
- Spec [[MAPAS]]: mapa sorteado por partida; cada mapa define qual baralho de cartas está ativo.
- Spec [[NEON]]: motor visual (brilho, glow); a interface das cartas usa o mesmo motor vetorial, não pixel art (decisão desta conversa: pixel art fica só pra imagens de cenário/fundo, como as usadas em [[MAPAS]]/home).
- **Remoção do modo bot** (spec própria, ainda não escrita): precisa estar entregue antes desta, porque o motor de ações estendido por esta spec (ver Notas Técnicas) não terá contrapartida no bot.

## 4. Requisitos

- **REQ-CARTAS-01:** Cada mapa **deve** ter seu próprio baralho de cartas, com 3 raridades: comum, rara, épica.
- **REQ-CARTAS-02:** Vencer um tabuleiro pequeno **deve** conceder ao vencedor uma carta sorteada do baralho do mapa ativo, com probabilidade 60% comum / 30% rara / 10% épica (v2: com 2 épicas por baralho, os 10% se dividem 5%/5% entre elas — sorteio uniforme dentro da raridade, sem mudar a REQ).
- **REQ-CARTAS-03:** Um tabuleiro pequeno que termina empatado **não deve** conceder carta a ninguém.
- **REQ-CARTAS-04:** A carta concedida **deve** ir pra "mão" do jogador; ele decide quando jogá-la, só na própria vez.
- **REQ-CARTAS-05:** A mão **deve** ter no máximo 3 cartas. Se já estiver cheia quando uma nova seria concedida, a carta nova é perdida (não substitui nem enfileira).
- **REQ-CARTAS-06:** Jogar uma carta **deve** consumir a jogada da vez — não é possível jogar carta e fazer a marcação normal no mesmo turno.
- **REQ-CARTAS-07:** O adversário **deve** ver quantas cartas o jogador tem na mão, mas não quais.
- **REQ-CARTAS-08:** O baralho do mapa **galáxia** é:
  - 🟢 Comum — **Salto Estelar**: ignora a regra de encaminhamento nesta jogada; marca em qualquer tabuleiro pequeno aberto e não bloqueado à escolha do jogador.
  - 🔵 Rara — **Buraco Negro**: apaga uma marca do adversário, escolhida pelo jogador, num tabuleiro pequeno ainda aberto.
  - 🔵 Rara — **Estrela da Sorte**: o jogador escolhe uma posição (0-8) e dois tabuleiros pequenos abertos onde essa posição esteja vazia nos dois; marca essa posição nos dois ao mesmo tempo com o símbolo dele.
  - 🟣 Épica — **Devorador de Tabuleiro**: escolhe um tabuleiro pequeno aberto; ele fica bloqueado (RN-CARTAS-02) pelas próximas 3 jogadas da partida.
  - 🟣 Épica — **Supernova** (v2, REQ-CARTAS-12): escolhe um tabuleiro pequeno **já decidido** (vencido por qualquer um, ou empatado); apaga todas as marcas dele, reabrindo-o do zero.
- **REQ-CARTAS-09:** O baralho do mapa **praia** é:
  - 🟢 Comum — **Bolha de Proteção**: escolhe um dos tabuleiros pequenos abertos do próprio jogador; ele fica protegido (RN-CARTAS-03) pelas próximas 3 jogadas.
  - 🔵 Rara — **Correnteza**: move uma marca do próprio jogador, escolhida por ele, pra outra célula vazia dentro do mesmo tabuleiro pequeno aberto.
  - 🔵 Rara — **Tempestade**: o jogador escolhe, entre os tabuleiros pequenos abertos e não bloqueados, pra qual o adversário será encaminhado na vez dele (ignora o encaminhamento normal uma vez).
  - 🟣 Épica — **Tsunami**: escolhe um tabuleiro pequeno aberto; todas as marcas nele são apagadas, ele volta a ficar vazio.
  - 🟣 Épica — **Maré Virada** (v2, REQ-CARTAS-13): escolhe um tabuleiro pequeno **já vencido pelo adversário**; as marcas do adversário nele viram marcas de quem jogou a carta.
- **REQ-CARTAS-10:** Desfazer uma jogada que concedeu uma carta ainda não jogada **deve** remover essa carta da mão; se a carta já foi jogada, desfazer a jogada de origem **não deve** reverter o efeito da carta.
- **REQ-CARTAS-11:** Numa partida online, o efeito de qualquer carta jogada por um dos lados **deve** chegar ao outro lado e produzir exatamente o mesmo resultado nos dois (determinístico, mesmo padrão do motor: `replay({config, histórico})` sempre chega no mesmo estado).
- **REQ-CARTAS-12** (v2): Supernova (galáxia) **deve** poder mirar um tabuleiro pequeno já decidido (vitória de X, de O, ou empate) — a única exceção à RN-CARTAS-01 — e apagar todas as marcas dele.
- **REQ-CARTAS-13** (v2): Maré Virada (praia) **deve** poder mirar um tabuleiro pequeno já vencido especificamente pelo adversário de quem joga a carta (nunca o próprio, nunca um empate) e substituir as marcas do adversário ali pelas de quem jogou.

## 5. Regras de Negócio

- **RN-CARTAS-01:** toda carta que precisa de um tabuleiro pequeno alvo (apagar marca, mover marca, bloquear, proteger, resetar) só pode mirar um tabuleiro **ainda aberto** (sem resultado) — nunca um já decidido (vencido ou empatado), pra não reabrir um resultado já contado no placar do tabuleiro grande. **Exceção (v2, RN-CARTAS-08):** Supernova e Maré Virada miram exatamente o oposto.
- **RN-CARTAS-02:** um tabuleiro **bloqueado** (Devorador de Tabuleiro) conta como indisponível pra regra de encaminhamento, igual a um tabuleiro decidido: se a jogada normal do adversário mandaria pra lá, ele joga livremente em qualquer tabuleiro aberto e não bloqueado.
- **RN-CARTAS-03** (v2, revisada): um tabuleiro **protegido** (Bolha de Proteção) é um escudo total contra quem não protegeu — nem carta do adversário, nem jogada normal do adversário entram nele, até a proteção expirar. Quem protegeu continua podendo jogar normalmente e usar suas próprias cartas ali. *(Original: só bloqueava carta do adversário; mudou depois de teste do usuário.)*
- **RN-CARTAS-04:** bloqueio e proteção duram **3 jogadas da partida inteira** (contando jogadas de qualquer jogador, em qualquer tabuleiro, incluindo jogadas de carta) — não é "3 turnos de cada jogador" nem "3 jogadas só naquele tabuleiro".
- **RN-CARTAS-05:** "Estrela da Sorte"/mecânica equivalente só pode ser jogada se existirem pelo menos dois tabuleiros abertos com a posição escolhida vazia nos dois; sem isso, a carta não pode ser jogada (interface recusa antes de confirmar).
- **RN-CARTAS-06:** nenhuma carta pode ser jogada fora da vez do jogador, nem depois da partida terminada.
- **RN-CARTAS-07:** o baralho é definido pelo mapa da partida (spec [[MAPAS]]); um jogador nunca recebe carta de um mapa que não é o da partida em andamento.
- **RN-CARTAS-08** (v2): Supernova/Maré Virada continuam respeitando bloqueio e proteção (RN-CARTAS-02/03) mesmo mirando tabuleiro decidido — só a exigência de "estar aberto" se inverte. Nenhuma das duas concede carta nova ao reabrir/roubar um tabuleiro (mesma regra das demais: só *placement* concede, nunca efeito de carta).

## 6. Critérios de Aceite

- **AC-CARTAS-01:** Dado um tabuleiro pequeno fechado com vencedor, quando isso acontece, então o vencedor recebe uma carta sorteada do baralho do mapa ativo (ou nenhuma, se a mão já tiver 3 cartas).
- **AC-CARTAS-02:** Dado um tabuleiro pequeno que fecha empatado, quando isso acontece, então nenhum jogador recebe carta.
- **AC-CARTAS-03:** Dado o jogador com "Buraco Negro" na mão, quando ele a joga escolhendo uma marca do adversário num tabuleiro aberto, então essa célula volta a vazio e a vez passa pro adversário.
- **AC-CARTAS-04:** Dado o jogador com "Estrela da Sorte", quando ele escolhe uma posição vazia nos dois tabuleiros selecionados, então essa posição é marcada com o símbolo dele nos dois ao mesmo tempo, numa única jogada.
- **AC-CARTAS-05:** Dado um tabuleiro bloqueado por "Devorador de Tabuleiro" (ou "Maré Alta" na praia), quando a regra de encaminhamento mandaria o próximo jogador pra ele, então esse jogador escolhe livremente entre os tabuleiros abertos e não bloqueados.
- **AC-CARTAS-06:** Dado um tabuleiro protegido por "Bolha de Proteção", quando o adversário tenta mirar uma carta nele **ou fazer uma jogada normal nele**, então nenhum dos dois é permitido (v2: escudo total, não só contra carta).
- **AC-CARTAS-07:** Dado uma partida online, quando um jogador joga qualquer carta, então o tabuleiro do adversário reflete o mesmo efeito, sem divergência entre os dois lados.
- **AC-CARTAS-08:** Dado o jogador com 3 cartas na mão, quando ele vence outro tabuleiro pequeno, então nenhuma carta nova é concedida.
- **AC-CARTAS-09:** Dado que uma jogada concedeu uma carta ainda não jogada, quando essa jogada é desfeita, então a carta some da mão.
- **AC-CARTAS-10:** Dado que uma carta já foi jogada (efeito aplicado), quando a jogada que a concedeu é desfeita (situação hipotética, já que desfazer sempre volta na ordem cronológica), então o efeito da carta permanece — não há reversão em cascata.
- **AC-CARTAS-11** (v2): Dado um tabuleiro pequeno decidido (vitória de X, O, ou empate), quando alguém joga "Supernova" mirando ele, então todas as marcas somem e ele volta a ficar em aberto, disponível pra qualquer jogador.
- **AC-CARTAS-12** (v2): Dado um tabuleiro pequeno vencido pelo adversário, quando o jogador joga "Maré Virada" mirando ele, então toda marca do adversário ali vira marca de quem jogou a carta (o resultado passa a favorecer quem jogou).
- **AC-CARTAS-13** (v2): Dado um tabuleiro pequeno vencido pelo PRÓPRIO jogador (ou empatado), quando ele tenta jogar "Maré Virada" mirando ele, então a carta recusa esse alvo — só rouba vitória alheia.

## 7. Fora do Escopo

- Modo "Contra o bot" usando cartas — o modo deixa de existir (ver Dependências); se um bot voltar no futuro, cartas pra ele são spec própria.
- Mapas além de galáxia e praia. *(v2: o limite de "4 cartas por mapa" caiu — cada baralho agora tem 5, ver REQ-CARTAS-08/09/12/13.)*
- Escolher qual carta específica receber — é sempre sorteio por raridade dentro do baralho do mapa.
- Trocar ou descartar cartas manualmente sem jogá-las.
- Animação/apresentação elaborada de "revelar carta" — nesta entrega o essencial é a carta funcionar corretamente; a UI da mão pode ser simples (ícone + nome + raridade), refinamento visual fica pra depois. *(v2: o seletor de alvo em si deixou de ser simples por pedido do usuário — virou grade 3x3 temática, ver Notas Técnicas; a mão continua ícone+nome+raridade.)*
- Balanceamento fino das probabilidades (60/30/10) e das durações (3 jogadas) — são o ponto de partida, ajustam depois de testar jogando.
- Pixel art pra qualquer elemento de interface (ícones, cartas, tabuleiro, marcas) — só cenário/fundo usa pixel art (decisão desta conversa), interface continua no motor vetorial atual.

## 8. Notas Técnicas

### Mudança estrutural no motor (`src/engine/`)

Hoje uma partida é uma sequência de **jogadas** puras: `Move = { player, path }`, e `GameState` é sempre reconstruível por `replay({config, moves})`. Cartas introduzem um segundo tipo de **ação**: jogar uma carta (com alvo variável por carta — uma marca, uma posição + dois tabuleiros, um tabuleiro). Pra manter a garantia central do motor ("todo estado é `{config, histórico}` reduzido por replay determinístico" — é o que barateia desfazer, retomada e reconexão p2p em toda a base), o histórico precisa virar uma sequência de **ações heterogêneas**, não só `Move`:

```ts
type Action =
  | { kind: 'move'; player: Player; path: Path }
  | { kind: 'card'; player: Player; card: CardId; target: CardTarget }; // formato do target varia por carta
```

Isso se propaga por: `GameState.moves` (renomeia conceitualmente pra `actions` ou mantém o nome com o tipo estendido), `serialize`/`replay`, o protocolo p2p (`P2PMessage` ganha ação de carta em vez de só `move`), a fila de som (carta tem seu próprio som, distinto de marca/risco), o replay/GIF (desenhar o efeito de uma carta num quadro) e a exportação/importação de partida. É a maior mudança técnica desta entrega — maior que tudo que [[MAPAS]] exigiu, porque lá nada tocava `src/engine/`.

### Estado novo por tabuleiro pequeno

`Board` (tipo recursivo em `src/engine/types.ts`) precisa de dois campos novos, só relevantes no nível folha (tabuleiro pequeno):

```ts
lockedUntilAction: number | null;    // Devorador de Tabuleiro / Maré Alta
protectedUntilAction: number | null; // Bolha de Proteção
```

Ambos comparados contra um contador global de ações da partida (RN-CARTAS-04). `allowedBoards()` (regra de encaminhamento) passa a tratar "bloqueado" igual a "decidido" pra fins de liberar escolha livre (RN-CARTAS-02).

### Mão de cartas

Não faz parte do `GameState` do motor — é estado derivado, reconstruível a qualquer momento reduzindo o histórico de ações (toda concessão de carta e toda carta jogada estão no histórico). Evita duplicar fonte de verdade.

### Sorteio determinístico

Igual ao mapa (`randomMapTheme`, spec [[MAPAS]]): o sorteio de qual carta é concedida precisa ser determinístico o bastante pra não divergir entre host e guest no online. Como toda concessão de carta é uma consequência de uma **jogada já confirmada** (vencer um tabuleiro), o host sorteia e o resultado (qual carta) entra no histórico sincronizado — o guest nunca sorteia por conta própria, só reproduz o que o histórico diz (mesmo padrão RN-MAPAS-03 já usado pro mapa).

### v2: Supernova/Maré Virada (tabuleiro decidido, não aberto)

As outras 8 cartas usam `boardTargetable()` (exige tabuleiro aberto). Essas duas usam um helper irmão, `decidedBoardTargetable()`, com a checagem de `resultOf` invertida — exige DECIDIDO em vez de aberto — mas reaproveitando as mesmas checagens de bloqueio/proteção. Maré Virada soma uma checagem a mais: o vencedor daquele tabuleiro tem que ser especificamente o adversário de quem joga a carta (`resultOf(board) === otherPlayer(move.player)`), senão a carta não faz sentido (não dá pra "roubar" seu próprio tabuleiro nem um empate).

### v2: Bolha de Proteção como escudo total

Bloqueio (Devorador de Tabuleiro) já excluía o tabuleiro de `allowedBoards()` pra jogada normal (RN-CARTAS-02). Proteção não fazia isso — só entrava em `boardTargetable()` (só cartas verificam ali). A revisão estendeu `isPlayablePath`/`playableLeafBoards` (`src/engine/board.ts`) com um parâmetro `blockedFor?: Player`, e `allowedBoards()` (`src/engine/game.ts`) agora passa `state.currentPlayer` — assim proteção passa a contar pra jogada normal também, do mesmo jeito que bloqueio já contava. `isProtectedAgainst` foi movido de `game.ts` pra `board.ts` (onde `isLocked` já morava) porque as duas funções de disponibilidade de tabuleiro (jogada normal e carta) precisam dela igualmente.

### v2: Seletor de alvo (grade 3x3)

O `<select>` nativo (v1) foi trocado por `GridPicker` (`src/ui/CardHand.tsx`): uma grade 3x3 de botões numerados, mesma linguagem visual do tabuleiro real (borda neon, brilho no hover/selecionado, tracejado+opaco quando inválido). Fluxos com mais de uma escolha (célula dentro de tabuleiro, posição+dois tabuleiros da Estrela da Sorte, origem+destino da Correnteza) viraram passos sequenciais de grades — primeiro tabuleiro, depois célula — em vez de uma lista achatada num único `<select>`. Nenhuma lógica de validação nova: cada grade continua filtrando via `validateCard`, igual à v1.

## 9. Rastreabilidade

| Código | Implementação (real) | Verificação |
|---|---|---|
| REQ-CARTAS-01, 08, 09 | `src/engine/cards.ts`: `CARD_DECKS` (5 por mapa desde v2), `cardMap`, `cardRarity` (não `src/theme/`: baralho é regra de jogo, o motor não pode depender de `src/ui/`) | `tests/engine/cards.test.ts` |
| REQ-CARTAS-02, 03, 05 | `src/engine/types.ts` (`Move.card/path2/cellIndex`, `Hands`, `GameState.hands/actionCount`); `src/engine/game.ts` (`grantIfNewlyWon`, chamado em `applyMove`) | `tests/engine/cards.test.ts` |
| REQ-CARTAS-04, 06, 07 | `src/ui/CardHand.tsx` (mão + `GridPicker` de alvo, v2), `src/ui/cardTargets.ts` (alvos válidos via `validateCard`), `src/ui/cardMeta.ts`/`src/ui/icons.tsx` (nome/ícone/raridade), `src/ui/GameScreen.tsx` (`viewerSymbol` decide qual mão é nomeada — REQ-CARTAS-07 vale igual em local e online) | `tests/e2e/cards.spec.ts` |
| REQ-CARTAS-10 | `src/engine/game.ts`: `undo` já reconstrói tudo por `replay`, mão incluída (nenhuma lógica extra necessária) | `tests/engine/cards.test.ts` |
| REQ-CARTAS-11 | `src/p2p/protocol.ts` (`move` ganha `card/path2/cellIndex`), `src/p2p/session.ts` (`playCard`, `onMove` valida com `validateCard`/`applyAction`) | `tests/p2p/session.test.ts` |
| REQ-CARTAS-12, 13 (v2) | `src/engine/game.ts`: `decidedBoardTargetable`, casos `supernova`/`mare-virada` em `validateCard`/`applyCard` | `tests/engine/cards.test.ts` |
| RN-CARTAS-01, 08 | `src/engine/game.ts`: `boardTargetable` (as 8 originais) vs `decidedBoardTargetable` (as 2 novas, v2) | `tests/engine/cards.test.ts` |
| RN-CARTAS-02, 03 (v2: escudo total) | `src/engine/board.ts`: `isProtectedAgainst` (movida de `game.ts`), `isPlayablePath`/`playableLeafBoards` com `blockedFor?`; `src/engine/game.ts`: `allowedBoards` passa `state.currentPlayer` | `tests/engine/cards.test.ts` |
| RN-CARTAS-04 | `src/engine/board.ts`: `isLocked` comparado contra `actionCount` | `tests/engine/cards.test.ts` |
| RN-CARTAS-05 | `src/engine/game.ts`: `validateCard` caso `estrela-da-sorte`; `src/ui/cardTargets.ts`: `starPositions` (recusa antes de confirmar) | `tests/engine/cards.test.ts` |
| RN-CARTAS-06, 07 | `src/engine/game.ts`: `validateCard` (`fora-de-vez`, `partida-encerrada`, `carta-de-outro-mapa`) | `tests/engine/cards.test.ts` |
| AC-CARTAS-01..13 | ver REQs/RNs correspondentes acima | `tests/engine/cards.test.ts`, `tests/e2e/cards.spec.ts` |

`Action` (Notas Técnicas) foi implementado como extensão de `Move` (campos opcionais `card`/`path2`/`cellIndex`) em vez de um novo tipo `{kind: 'move'|'card', ...}` — mesmo histórico heterogêneo, sem trocar o nome/formato de `GameState.moves` nem quebrar `serialize`/replay existentes. `applyAction(state, move)` é o ponto único usado por `replay`, `undo`, P2P sync e GIF.
