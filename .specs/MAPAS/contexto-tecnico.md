# Guia de Contexto Técnico — MAPAS

## 1. O que foi alterado

Introduz um novo conceito, `MapTheme` (`'galaxy' | 'beach'`), sorteado por partida e propagado por toda a cadeia que já existia pra tema/paleta: criação de partida (local e online), persistência (retomar), sincronização p2p, biblioteca/replay, export/import e GIF. O que antes era "o tema do jogo" (fixo, spec NEON) virou "o mapa desta partida" (um de vários, sorteado). A paleta CSS é resolvida por `[data-map]` no elemento `.app`, com `:root` continuando como o padrão galáxia. Nenhuma regra de jogo mudou — é inteiramente visual (RN-MAPAS-01).

## 2. Referência da demanda

Spec: `.specs/MAPAS/spec.md`.
Entrega: REQ-MAPAS-01 a 08, RN-MAPAS-01 a 03, AC-MAPAS-01 a 07.

## 3. Mudanças de dados

Não há banco de dados — persistência é toda em `localStorage`. Todo campo novo segue o mesmo padrão defensivo já usado pro campo `mode` (spec STT): opcional na leitura, com fallback pra `'galaxy'` via `normalizeMap()` (`src/theme/maps.ts`). Nenhuma migration, nenhuma perda de dado existente.

```
stt.match (SavedMatch)     + campo `map: MapTheme`  — fallback na leitura (loadMatch)
stt.p2p   (SavedOnline)    + campo `map: MapTheme`  — fallback na leitura (loadOnline)
stt.library (LibraryEntry) + campo `map: MapTheme`  — fallback na leitura (listLibrary)
arquivo .json exportado    + campo `map`            — fallback na importação (parseImported)
```

Não-destrutivo nos dois sentidos: dado antigo sem `map` lido por esta versão vira galáxia; dado novo com `map` lido por uma versão anterior tem o campo simplesmente ignorado.

## 4. Fluxo de chamadas e integrações

```
Partida local nova
  SetupScreen.confirmConfig → onStart(setup)         [sem alteração]
  App.startMatch                                     [alterado: sorteia randomMapTheme() e grava em Match.map]
  App.persistMatch → storage.saveMatch                [alterado: grava match.map]

Retomada local
  App.handleResume                                    [alterado: usa pendingResume.map, não sorteia]

Revanche local
  App.handleRematch                                   [sem alteração — Match.map sobrevive ao spread ...match]

Sala online nova (host)
  SetupScreen.confirmConfig → onStartOnline(init)      [alterado: sorteia randomMapTheme(), inclui em OnlineInit.map]
  OnlineGame → new P2PSession({..., map: init.map})    [alterado]
  P2PSession (host, ctor)                              [alterado: this.map = normalizeMap(init.map)]
  P2PSession.onHello → envia msg 'config' com map      [alterado]

Sala online (guest, partida nova)
  OnlineGame → new P2PSession({role:'guest', ...})     [sem alteração — guest nunca sorteia]
  P2PSession.onConfig (guest)                          [alterado: adota this.map = normalizeMap(msg.map)]
  P2PSession.onSync (qualquer papel)                   [alterado: adota map junto do histórico mais longo]
  P2PSession.snapshot()                                [alterado: expõe map]
  OnlineGame (onChange do snapshot)                    [alterado: chama onMapChange(snap.map)]
  App (onMapChange={setOnlineMap})                     [novo: estado onlineMap alimenta currentMap]

Retomada/reconexão online
  App → setOnline({..., saved: pendingOnline})         [sem alteração — saved.map já vem do storage]
  P2PSession (ctor, saved)                              [alterado: this.map = normalizeMap(init.saved.map)]

Render (App.tsx)
  currentMap = match.map | replayEntry.map | onlineMap | 'galaxy' (fallback, RN-MAPAS-02)  [novo]
  <div className="app" data-map={currentMap}>           [novo atributo]
  <MapBackground map={currentMap}>                      [novo componente: escolhe Cosmic/BeachBackground]

Biblioteca / Replay / GIF
  App.matchEntry / OnlineGame.snapshotEntry             [alterado: inclui map na LibraryEntry]
  replay/library.listLibrary                            [alterado: fallback normalizeMap]
  replay/exchange.exportEntry                           [sem alteração de código — map inclui via spread]
  replay/exchange.parseImported                         [alterado: fallback normalizeMap]
  replay/gif.themePalette()                             [alterado: lê getComputedStyle a partir de `.app`, não mais de document.documentElement — é onde [data-map] mora]
```

## 5. Validações aplicadas

- RN-MAPAS-01: nenhum código de `src/engine/` foi tocado; o mapa não influencia nenhuma regra de jogo.
- RN-MAPAS-02: fora de uma partida específica (biblioteca navegando, diálogos de retomar antes de decidir), `currentMap` cai no fallback `'galaxy'` em vez de exigir um mapa "ativo".
- RN-MAPAS-03: `randomMapTheme()` só é chamado em `App.startMatch` (local) e `SetupScreen.confirmConfig` (host online); o guest nunca chama essa função — sempre lê `msg.map` recebido do host.
- Toda leitura de `map` vindo de armazenamento, mensagem de rede ou arquivo importado passa por `normalizeMap()` (`src/theme/maps.ts`), que devolve `'galaxy'` pra qualquer valor que não seja exatamente `'galaxy'` ou `'beach'` — cobre campo ausente, `undefined`, string inválida ou dado corrompido.
- Hook de teste `stt.forceMap` (lido por `randomMapTheme`): só força o sorteio quando presente no `localStorage`; ausência não muda o comportamento de produção.

## 6. Possíveis impactos colaterais

- **`themePalette()` (GIF) muda a fonte de leitura** de `document.documentElement` pra `.app`. Nada mais no código lia dessa função além de `generateGif`/o teste de replay; sem consumidor quebrado.
- **CSS**: o gradiente de fundo (nebulosa/água) saiu de `body` e passou a viver em `.cosmic-bg`/`.beach-bg`. `body` mantém só `background-color: var(--bg)` como reserva. Como uma das três camadas decorativas (`PlanetBackground`, `CosmicBackground`, `BeachBackground`) está sempre montada por cima, isso é imperceptível na prática — só reduz a janela (já mínima) onde o fundo puro de `body` aparece antes do React montar.
- **Keyframes CSS renomeados** (`cosmic-float`→`float-up`, `cosmic-drift-ltr/rtl`→`drift-ltr/rtl`, `cosmic-bob`→`bob`) pra serem compartilhados entre `.cosmic-*` e `.beach-*`. Não há mais nenhuma referência aos nomes antigos no código nem nos testes (conferido por busca no repositório).
- **`P2PMessage` (`'config'`/`'sync'`) ganhou campo obrigatório `map`.** Não subiu `PROTOCOL_VERSION`: o site é sempre servido na build mais recente do GitHub Pages, não há cliente antigo coexistindo com um novo pra essas duas mensagens divergirem de formato.
- Testes e2e que dependiam do mapa galáxia especificamente (fundo do GIF, classes `.cosmic-*`) foram ajustados pra forçar `stt.forceMap=galaxy` via `page.addInitScript`, evitando flakiness por sorteio aleatório.
