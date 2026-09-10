# ESTAT: Estatísticas locais do jogador

> **Nota (2026-09-10):** esta spec ainda não foi implementada. O modo "contra o bot" que ela cita em vários requisitos foi **removido** do jogo (`.specs/REMOVER-BOT/spec.md`) antes de esta feature ter sido construída — revisar REQ-ESTAT-01, 04, RN-ESTAT-05 e os cenários AC-ESTAT-01/02 (todos citam o bot) antes de implementar.

## 1. História de Usuário

**Como** jogador, **Quero** ver minhas estatísticas acumuladas neste aparelho (partidas, vitórias, aproveitamento, sequências e desempenho contra cada nível do bot), **Para que** eu acompanhe minha evolução sem depender de conta nem de servidor.

## 2. Contexto do Problema

A biblioteca já guarda as partidas terminadas, mas com limite de 100 e sem noção de "quem sou eu" em cada partida: no modo bot o humano é quem não é o bot, no online sou o criador ou o convidado, e no local as duas pessoas estão no mesmo aparelho. Sem registrar essa perspectiva e sem contadores próprios, não é possível dizer "você venceu X de Y" de forma confiável ao longo do tempo.

## 3. Dependências

- Spec [[REPLAY]] (biblioteca de partidas terminadas), já entregue: a gravação de estatísticas acontece no mesmo momento em que a partida entra na biblioteca.

## 4. Requisitos

- **REQ-ESTAT-01:** O sistema **deve** registrar, em cada partida terminada, a perspectiva do dono do aparelho: o símbolo com que ele jogou (modos bot e online) ou a marca de que a partida foi local (sem lado "seu").
- **REQ-ESTAT-02:** O sistema **deve** manter contadores acumulados que sobrevivem ao limite de 100 partidas da biblioteca e à exclusão de partidas.
- **REQ-ESTAT-03:** O sistema **deve** oferecer uma tela de estatísticas com: total de partidas, vitórias, derrotas, empates e aproveitamento percentual.
- **REQ-ESTAT-04:** A tela **deve** recortar os números por modo: contra o bot (separado por dificuldade fácil, médio e difícil), online e local.
- **REQ-ESTAT-05:** A tela **deve** exibir a sequência atual de vitórias e a melhor sequência já alcançada.
- **REQ-ESTAT-06:** O sistema **deve** permitir zerar as estatísticas, com confirmação, sem apagar a biblioteca de partidas.
- **REQ-ESTAT-07:** Todos os textos novos seguem o i18n pt/en (REQ-STT-17).

## 5. Regras de Negócio

- **RN-ESTAT-01:** só contam partidas jogadas neste aparelho; partidas importadas de arquivo nunca entram nas estatísticas.
- **RN-ESTAT-02:** partidas locais contam em "partidas locais" e no total geral, mas não geram vitória ou derrota "sua", porque os dois lados são do mesmo aparelho.
- **RN-ESTAT-03:** desfazer o fim de uma partida (que a retira da biblioteca) também reverte o que ela somou nas estatísticas; terminar de novo soma outra vez, sem duplicar.
- **RN-ESTAT-04:** excluir uma partida da biblioteca não altera as estatísticas, porque elas são contadores independentes do histórico guardado.
- **RN-ESTAT-05:** a sequência de vitórias considera apenas partidas com lado "seu" (bot e online), em ordem de término; derrota ou empate zera a sequência atual.

## 6. Critérios de Aceite

**Cenário AC-ESTAT-01: vitória contra o bot conta**
**Dado que** as estatísticas estão zeradas
**Quando** o jogador vence uma partida contra o bot no nível médio
**Então** o total mostra 1 partida, 1 vitória, aproveitamento 100 por cento, e o recorte "bot médio" mostra 1 vitória.

**Cenário AC-ESTAT-02: derrota e empate**
**Dado que** o jogador tem 1 vitória registrada
**Quando** ele perde uma partida contra o bot e empata outra
**Então** o total mostra 3 partidas, 1 vitória, 1 derrota, 1 empate.

**Cenário AC-ESTAT-03: partida local não gera vitória sua**
**Dado que** as estatísticas estão zeradas
**Quando** duas pessoas terminam uma partida local
**Então** o total de partidas aumenta e o recorte "local" mostra 1, mas vitórias e derrotas continuam em zero.

**Cenário AC-ESTAT-04: sequência de vitórias**
**Dado que** o jogador venceu 3 partidas seguidas contra o bot
**Quando** ele perde a quarta
**Então** a sequência atual volta a zero e a melhor sequência permanece 3.

**Cenário AC-ESTAT-05: desfazer o fim reverte**
**Dado que** uma partida vencida acabou de entrar nas estatísticas
**Quando** o jogador desfaz a jogada final e depois termina a partida de novo
**Então** a vitória aparece contada uma única vez.

**Cenário AC-ESTAT-06: importar não conta**
**Dado que** o jogador importa um arquivo de partida
**Quando** ele abre as estatísticas
**Então** os números não mudaram, apenas a biblioteca ganhou a partida.

**Cenário AC-ESTAT-07: excluir da biblioteca preserva estatísticas**
**Dado que** o jogador tem 5 partidas contadas
**Quando** ele exclui todas da biblioteca
**Então** as estatísticas continuam mostrando as 5 partidas.

**Cenário AC-ESTAT-08: zerar com confirmação**
**Dado que** existem estatísticas acumuladas
**Quando** o jogador aciona zerar e confirma
**Então** todos os números voltam a zero e a biblioteca permanece intacta.

## 7. Fora do Escopo

- Ranking global, contas de usuário e comparação com outros jogadores (exigiria backend, o que contraria a arquitetura estática do projeto).
- Estatísticas por nome de jogador no modo local (perfis separados no mesmo aparelho).
- Gráficos de evolução ao longo do tempo, mapas de calor de casas mais jogadas e tempo médio por jogada.
- Sincronização entre aparelhos e exportação das estatísticas.

## 8. Notas Técnicas

- Armazenamento: `localStorage["stt.stats"]`, um objeto de contadores (totais, por modo, por dificuldade, sequências), atualizado no mesmo ponto em que a partida entra na biblioteca.
- `LibraryEntry` ganha um campo de perspectiva (`myMark: 'X' | 'O' | null`), com `null` para partidas locais e importadas; entradas antigas sem o campo são lidas como `null` (migração leniente, como já foi feito com o campo `mode`).
- A reversão de RN-ESTAT-03 usa o mesmo gancho que hoje remove a entrada da biblioteca quando o fim é desfeito.
