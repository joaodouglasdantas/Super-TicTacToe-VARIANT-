# MAPAS: Mapas aleatórios por partida (galáxia + praia)

## 1. História de Usuário

**Como** jogador, **Quero** que cada partida sorteie um visual de mapa diferente (hoje: galáxia ou praia), sem eu escolher, **Para que** o jogo tenha variedade a cada rodada, preparando terreno pro sistema de cartas de cada mapa (spec futura, ainda não escrita).

## 2. Contexto do Problema

A spec [[NEON]] entregou um único visual neon-galáctico pro jogo inteiro. O usuário quer ir além: o visual da galáxia vira o primeiro de vários "mapas" possíveis, sorteado por partida (não escolhido), cada um com sua própria paleta e camada decorativa, mas todos usando o mesmo "motor" visual (brilho neon, partículas, criaturas flutuando) por consistência. Esta entrega adiciona a infraestrutura de sorteio + um segundo mapa (praia/aquário, paleta aquática, referência visual enviada pelo usuário). Um sistema de cartas por mapa (efeitos que alteram a partida) foi discutido e decidido em parte, mas fica para uma spec própria — ver Fora do Escopo.

## 3. Dependências

- Spec [[NEON]]: motor visual neon (brilho, glow, `CosmicBackground`), tema único sempre escuro. O mapa galáxia desta spec **é** o que a NEON entregou; nada nela muda.
- Spec [[P2P]]: protocolo de sincronização online (`P2PMessage`, `P2PSession`). Esta spec estende as mensagens `config`/`sync` com o campo `map`.
- Spec [[REPLAY]], [[REPLAY2]]: biblioteca, replay e GIF — precisam carregar/exibir o mapa correto de cada partida salva.

## 4. Requisitos

- **REQ-MAPAS-01:** Toda partida nova (local, bot ou online) **deve** sortear aleatoriamente um mapa entre os disponíveis (galáxia, praia), sem o jogador escolher.
- **REQ-MAPAS-02:** O mapa sorteado **deve** determinar a paleta (cores do tabuleiro, marcas, brilho) e a camada decorativa de fundo da partida, mantendo o mesmo motor visual (brilho neon, partículas, criaturas flutuando) com conteúdo e paleta próprios por mapa — não uma linguagem visual diferente por mapa (ex: não vira pixel-art).
- **REQ-MAPAS-03:** Numa partida online, os dois lados **devem** ver o mesmo mapa: o host sorteia, o guest adota o que recebe.
- **REQ-MAPAS-04:** O mapa de uma partida **deve** sobreviver a: retomar após fechar o navegador (local e online), abrir o replay, exportar/importar a partida como arquivo, e o GIF exportado.
- **REQ-MAPAS-05:** Partidas salvas antes desta entrega (sem mapa registrado) **devem** assumir o mapa galáxia por padrão, sem erro.
- **REQ-MAPAS-06:** Revanche (local ou online) **deve** manter o mesmo mapa da partida anterior, sem sortear de novo.
- **REQ-MAPAS-07:** O novo mapa "praia" **deve** ter paleta aquática (água profunda, laranja/coral pra marca X, turquesa pra marca O, dourado areia nas linhas/destaque) e camada decorativa própria (bolhas subindo, criaturas aquáticas — peixe, água-viva, cavalo-marinho), no mesmo motor de brilho do mapa galáxia (REQ-NEON-03).
- **REQ-MAPAS-08:** O som de jogada (spec [[SOM]]/[[NEON]]) **permanece o mesmo para os dois mapas** nesta entrega; diferenciar timbre por mapa fica fora de escopo por ora (REQ-NEON-07 não muda).

## 5. Regras de Negócio

- **RN-MAPAS-01:** a escolha de mapa é só visual — nenhuma regra de jogo muda por mapa nesta entrega (isso é reservado pro sistema de cartas, spec futura).
- **RN-MAPAS-02:** fora de uma partida específica (tela inicial, biblioteca navegando sem abrir replay, diálogo de retomar antes de decidir) não existe "mapa ativo": o visual padrão (galáxia) é usado como fallback, sem quebrar nem exigir escolha.
- **RN-MAPAS-03:** sortear o mapa é responsabilidade de quem **cria** a partida (local: quem clica "Começar"; online: o host ao criar a sala). Quem entra numa sala existente (guest) nunca sorteia por conta própria — sempre adota o mapa recebido do host, mesmo padrão já usado pra `config`/`hostSymbol` (CL-P2P-05).

## 6. Critérios de Aceite

- **AC-MAPAS-01:** Dado que o jogador começa uma partida local nova, quando a tela do jogo aparece, então o visual corresponde a um dos mapas disponíveis, sorteado sem interação do jogador.
- **AC-MAPAS-02:** Dado dois jogadores numa sala online, quando a partida começa, então os dois veem exatamente o mesmo mapa (mesma paleta, mesmo fundo decorativo).
- **AC-MAPAS-03:** Dado que uma partida é salva e o navegador é fechado, quando o jogador retoma, então o mapa é o mesmo de antes (não sorteia de novo).
- **AC-MAPAS-04:** Dado uma partida salva antes desta mudança (sem campo de mapa no localStorage), quando ela é carregada, então nenhum erro ocorre e o mapa exibido é galáxia.
- **AC-MAPAS-05:** Dado o mapa praia ativo, quando o jogador olha o tabuleiro, então marcas e linhas usam a paleta aquática (não a roxa/ciano da galáxia), com o mesmo brilho neon.
- **AC-MAPAS-06:** Dado uma partida no mapa praia terminada e o GIF exportado, quando o GIF é aberto, então o fundo/cores do GIF refletem o mapa praia daquela partida especificamente (não sempre galáxia).
- **AC-MAPAS-07:** Dado uma revanche (local ou online), quando ela começa, então o mapa é o mesmo da partida anterior.

## 7. Fora do Escopo

- Sistema de cartas por mapa (efeitos que alteram jogadas/tabuleiros) — decisões já tomadas com o usuário (ver memória local do agente), spec própria antes de codar.
- Mais mapas além de galáxia e praia.
- Deixar o jogador escolher o mapa manualmente.
- Diferenciar o timbre do som sintetizado por mapa.
- Qualquer mudança de regra de jogo, bot ou engine (`src/engine/` não muda nesta entrega).

## 8. Notas Técnicas

- **Novo módulo `src/theme/maps.ts`:** `type MapTheme = 'galaxy' | 'beach'` e `randomMapTheme()`.
- **CSS:** `:root` continua com a paleta galáxia (default); novo bloco `.app[data-map='beach']` sobrescreve as mesmas variáveis (`--bg`, `--mark-x/o`, `--line`, `--card-bg`, `--accent`, `--title-glow`), mesmo mecanismo já usado por `.home-minimal`. `data-map` é escrito no elemento `.app` (não em `document.documentElement`), então `src/replay/gif.ts` (`themePalette`) precisa ler as variáveis computadas a partir de `.app`, não mais de `document.documentElement`.
- **Novo componente `BeachBackground.tsx`** (irmão de `CosmicBackground.tsx`): bolhas subindo (reaproveitando o mecanismo de partícula existente, só recolorido) e 3 criaturas aquáticas em SVG próprio (peixe, água-viva, cavalo-marinho), mesmo padrão de posicionamento determinístico (`random.ts`), `pointer-events:none`, `aria-hidden`, resposta a `prefers-reduced-motion`. Um novo `MapBackground.tsx` escolhe entre `CosmicBackground`/`BeachBackground` pelo mapa ativo.
- **Propagação do campo `map`:**
  - `src/storage/persist.ts`: `SavedMatch.map` e `SavedOnline.map` (`MapTheme`); leitura com fallback `?? 'galaxy'` pra dados salvos antes desta entrega (mesmo padrão já usado pra `mode`).
  - `src/replay/library.ts`: `LibraryEntry.map`; `listLibrary()` aplica o mesmo fallback.
  - `src/replay/exchange.ts`: `map` entra no JSON exportado (via spread, automático) e é validado/normalizado (fallback `'galaxy'`) em `parseImported`.
  - `src/p2p/protocol.ts`: campo `map: MapTheme` nas mensagens `'config'` e `'sync'` (`P2PMessage`). Não precisa subir `PROTOCOL_VERSION` — o site é sempre servido na versão mais recente (sem clientes antigos coexistindo).
  - `src/p2p/session.ts`: `P2PSession` sorteia o mapa no construtor quando `role: 'host'` e não é retomada (`randomMapTheme()`); adota o mapa salvo em retomada (`init.saved.map`); guest adota o mapa recebido em `onConfig`/`onSync`. `SessionSnapshot.map` exposto pra UI. `startRematch()` mantém o mapa atual (RN vale pros dois lados, sem mensagem nova).
  - `src/ui/App.tsx`: `Match.map`; sorteia em `startMatch` (partida nova local/bot), usa o salvo em retomada; deriva `currentMap` (o mapa da partida ativa, ou `'galaxy'` como fallback fora de partida, RN-MAPAS-02) e aplica `data-map={currentMap}` em `.app` junto da troca `CosmicBackground`/`BeachBackground` via `MapBackground`.
  - `src/ui/SetupScreen.tsx`: ao criar sala online, sorteia o mapa e inclui em `OnlineInit`.
  - `src/ui/OnlineGame.tsx`: repassa `map` pro `P2PSession`/`SavedOnline`/`LibraryEntry` (`snapshotEntry`).
  - `src/ui/GameScreen.tsx`/`ReplayScreen.tsx`: sem mudança de lógica — só recebem o mapa já resolvido via `data-map` no ancestral `.app`.

## 9. Rastreabilidade

| Código | Implementação | Verificação |
|---|---|---|
| REQ-MAPAS-01 | `src/theme/maps.ts`, `src/ui/App.tsx` (startMatch), `src/ui/SetupScreen.tsx` (online) | `tests/e2e` novo, `tests/p2p/session.test.ts` |
| REQ-MAPAS-02 | `src/ui/themes.css`, `src/ui/BeachBackground.tsx`, `src/ui/MapBackground.tsx` | inspeção visual + teste de paleta (cor computada) |
| REQ-MAPAS-03 | `src/p2p/protocol.ts`, `src/p2p/session.ts` | `tests/p2p/session.test.ts` |
| REQ-MAPAS-04 | `src/storage/persist.ts`, `src/ui/ReplayScreen.tsx`, `src/replay/exchange.ts`, `src/replay/gif.ts` | testes e2e de persistência/replay/export/GIF |
| REQ-MAPAS-05 | `src/storage/persist.ts`, `src/replay/library.ts`, `src/replay/exchange.ts` | teste unitário/e2e com dado legado sem `map` |
| REQ-MAPAS-06 | `src/ui/App.tsx` (handleRematch), `src/p2p/session.ts` (startRematch) | teste e2e |
| REQ-MAPAS-07 | `src/ui/themes.css`, `src/ui/BeachBackground.tsx` | inspeção visual (guia de validação) |
| REQ-MAPAS-08 | (sem mudança em `src/audio/`) | revisão de código |
| RN-MAPAS-01..03 | ver REQs acima | revisão de código + testes citados |
| AC-MAPAS-01..07 | ver REQs correspondentes | testes citados na coluna anterior |
