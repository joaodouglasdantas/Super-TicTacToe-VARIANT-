# REMOVER-BOT: remoção do modo "Contra o bot"

## 1. História de Usuário

**Como** dono deste fork, **Quero** tirar o modo "Contra o bot" do jogo, **Para que** o jogo fique só com os modos que continuam evoluindo (local e online), sem manter um modo que não vai ganhar o sistema de cartas que está vindo a seguir (spec [[CARTAS]]).

## 2. Contexto do Problema

A spec [[CARTAS]] (cartas de evento por mapa, dadas ao vencer um tabuleiro pequeno) pressupõe um jogador humano decidindo quando jogar cada carta. O bot (`src/bot/bot.ts`, busca minimax de até 3 níveis) nunca foi desenhado pra isso, e ensinar ele a decidir cartas é um problema à parte, fora do apetite atual do projeto. Em vez de deixar o modo bot pela metade (existindo, mas sem cartas, uma experiência inconsistente com os outros modos), a decisão foi tirar o modo do jogo inteiro, como entrega separada e anterior à implementação de CARTAS.

Decisão tomada com o usuário em conversa (durante a formulação da spec CARTAS): remover completamente, não deixar o bot sem cartas.

## 3. Dependências

- Spec [[STT]]: fundadora, definia o bot como um dos três modos originais (REQ-STT-05). Esta spec revoga essa parte — ver nota adicionada no topo de `.specs/STT/spec.md`.
- Spec [[CARTAS]]: só pode começar a ser implementada depois desta entrega (pré-condição já registrada lá).
- Spec [[ESTAT]] (estatísticas, ainda não implementada): tem requisitos que citam o modo bot; recebeu uma nota de atenção, precisa de revisão antes de ser implementada.

## 4. Requisitos

- **REQ-REMOVERBOT-01:** O botão "1 jogador"/"Contra o bot" **não deve mais aparecer** na tela inicial.
- **REQ-REMOVERBOT-02:** O motor de IA (`src/bot/`) **deve ser removido** do repositório — nenhum código de produção depende dele.
- **REQ-REMOVERBOT-03:** Partida salva, entrada de biblioteca ou arquivo exportado **de antes desta remoção**, com modo `'bot'` registrado, **deve continuar carregando sem erro**, tratado como partida local (nenhum campo de dificuldade é lido nem exigido).
- **REQ-REMOVERBOT-04:** Textos de interface exclusivos do modo bot (dificuldade, nome "Bot", "1 jogador") **devem ser removidos** do i18n (pt/en); textos genéricos que sobrevivem (ex: "2 jogadores") continuam.
- **REQ-REMOVERBOT-05:** Nenhuma regra do motor de jogo (`src/engine/`) muda — o bot só consumia a API pública dele, nunca teve acoplamento na direção contrária.

## 5. Regras de Negócio

- **RN-REMOVERBOT-01:** documentação histórica (specs já entregues que descreviam o bot como parte do escopo original) não é reescrita — recebe uma nota datada apontando pra esta spec, preservando o registro do que foi verdade quando cada uma foi escrita.

## 6. Critérios de Aceite

- **AC-REMOVERBOT-01:** Dado a tela inicial, quando carregada, então não existe nenhum elemento com `data-testid="mode-bot"`.
- **AC-REMOVERBOT-02:** Dado o repositório depois da remoção, quando buscado por importadores de `src/bot`, então não existe nenhum (a pasta não existe mais).
- **AC-REMOVERBOT-03:** Dado um `localStorage` com uma partida, entrada de biblioteca ou preferência salva com `mode: 'bot'` (dado de antes da remoção), quando o app carrega essa entrada, então nenhum erro ocorre e ela é tratada como partida local.
- **AC-REMOVERBOT-04:** A suíte de testes completa (`npm test`, `npm run test:ui`) passa depois da remoção.

## 7. Fora do Escopo

- Qualquer forma de bot/IA voltar no futuro — se acontecer, é uma spec nova, não uma reversão desta.
- Migrar ou apagar ativamente dados antigos (`mode: 'bot'`) do `localStorage` de quem já jogou — eles só deixam de ser lidos como "bot", sem limpeza ativa (não há necessidade, ninguém exibe esse campo).
- Revisão ou reescrita de specs históricas que citam o bot (`OFFLINE`, `CONEXAO`, `REPLAY`, `SOM`, `REPLAY2`, `RISCO`, `MAPAS`, `MENU`) — permanecem como estão, documentando o que era verdade quando foram escritas (RN-REMOVERBOT-01). Só `STT` (fundadora) e `ESTAT` (feature futura ainda não implementada, citaria o bot se fosse implementada hoje) recebem nota.

## 8. Notas Técnicas

Mapeamento completo do que foi tocado (arquivos deletados, editados, e specs anotadas) está registrado no Guia de Contexto Técnico desta entrega (`.specs/REMOVER-BOT/contexto-tecnico.md`), não repetido aqui.

## 9. Rastreabilidade

| Código | Implementação | Verificação |
|---|---|---|
| REQ-REMOVERBOT-01 | `src/ui/SetupScreen.tsx` | `tests/e2e/menu.spec.ts` |
| REQ-REMOVERBOT-02 | `src/bot/` apagado; `src/ui/App.tsx`, `src/ui/SetupScreen.tsx`, `src/storage/persist.ts` sem import | revisão de código (grep) |
| REQ-REMOVERBOT-03 | `src/replay/library.ts` (`listLibrary`), `src/replay/exchange.ts` (`parseImported`) | testes unitários/e2e existentes de persistência |
| REQ-REMOVERBOT-04 | `src/i18n/index.ts` | revisão de código |
| REQ-REMOVERBOT-05 | (nenhuma mudança em `src/engine/`) | suíte de `tests/engine/` continua verde sem alteração |
| RN-REMOVERBOT-01 | nota no topo de `.specs/STT/spec.md` e `.specs/ESTAT/spec.md` | revisão de código |
| AC-REMOVERBOT-01..04 | ver REQs correspondentes | testes citados |
