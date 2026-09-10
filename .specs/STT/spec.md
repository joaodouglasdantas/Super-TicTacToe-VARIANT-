# STT: Super TicTacToe jogável no navegador (local, bot e p2p)

> **Nota (2026-09-10):** o modo "contra o bot" descrito nesta spec (REQ-STT-05, 07; AC-STT-07, 08) foi **removido** do jogo — ver `.specs/REMOVER-BOT/spec.md`. Esta spec continua documentando o escopo fundador tal como foi entregue e validado na época; não foi reescrita.

## 1. História de Usuário

**Como** jogador, **Quero** jogar Super TicTacToe no navegador contra outra pessoa (no mesmo dispositivo ou via web) ou contra um bot, **Para que** eu me divirta com o jogo sem instalar nada e sem depender de servidor pago.

## 2. Contexto do Problema

Não existe o projeto ainda: esta spec funda o produto. O alvo final é o multiplayer via web (p2p), e os modos local e contra bot são degraus intermediários que compartilham o mesmo motor de jogo. O jogo será publicado como página estática no GitHub Pages, o que impõe a restrição de não haver backend próprio.

## 3. Dependências

- N/A (projeto novo, sem specs anteriores).

## 4. Requisitos

### Motor de jogo

- **REQ-STT-01:** O sistema **deve** implementar o motor de regras de forma recursiva, suportando tabuleiro de profundidade N (célula simples na base, tabuleiro de tabuleiros acima), ainda que a UI desta entrega exponha apenas profundidade 2 (o Super TicTacToe clássico).
- **REQ-STT-02:** O motor **deve** validar toda jogada (célula livre, tabuleiro permitido, partida em andamento) e rejeitar jogadas inválidas sem alterar o estado.
- **REQ-STT-03:** O motor **deve** expor as regras variáveis como configuração da partida, definida na criação e imutável durante o jogo: variante de limpeza (RN-STT-04), critério de desempate (RN-STT-05), quem começa e com qual símbolo (RN-STT-06).

### Modos de jogo

- **REQ-STT-04:** O sistema **deve** oferecer o modo multiplayer local: dois jogadores alternando no mesmo dispositivo.
- **REQ-STT-05:** O sistema **deve** oferecer o modo contra bot com três níveis de dificuldade: fácil (jogada aleatória válida), médio (heurísticas de ganhar e bloquear) e difícil (busca, por exemplo minimax ou MCTS).
- **REQ-STT-06:** O sistema **deve** oferecer o modo multiplayer via web p2p: um jogador cria a sala e recebe um código; o outro entra informando o código. A conexão é WebRTC direta entre navegadores, com sinalização via broker público gratuito (PeerJS).

### Experiência de partida

- **REQ-STT-07:** O sistema **deve** permitir desfazer a última jogada: livre no modo local; no modo bot desfaz o par (jogada do bot e a do jogador); no modo p2p só com consentimento do adversário (pedido e aceite explícitos).
- **REQ-STT-08:** O sistema **deve** oferecer revanche rápida ao fim da partida, mantendo adversário e configurações, com alternância de quem começa.
- **REQ-STT-09:** O sistema **deve** manter placar da sessão (vitórias, derrotas, empates) entre os mesmos jogadores enquanto durar a sessão.
- **REQ-STT-10:** O sistema **deve** exibir o histórico de jogadas da partida em andamento, em formato que permita replay futuro.
- **REQ-STT-11:** A UI **deve** ser responsiva, funcionando em desktop e celular, com o tabuleiro aninhado legível e clicável em tela pequena.
- **REQ-STT-12:** A UI **deve** indicar visualmente em qual(is) tabuleiro(s) o jogador da vez pode jogar.

### Persistência e reconexão

- **REQ-STT-13:** O sistema **deve** persistir no navegador as preferências (regras escolhidas, dificuldade do bot, nome do jogador) entre sessões.
- **REQ-STT-14:** O sistema **deve** persistir a partida em andamento dos modos local e bot: ao reabrir o navegador, o jogador pode retomar de onde parou.
- **REQ-STT-15:** No modo p2p, o sistema **deve** preservar o estado da partida numa queda de conexão e permitir reconexão pelo mesmo código de sala, retomando do ponto em que parou. O jogador que permaneceu vê o status "aguardando reconexão" e pode optar por encerrar a partida.

### Publicação

- **REQ-STT-16:** O sistema **deve** funcionar integralmente como site estático hospedável no GitHub Pages, sem backend próprio.

### Idioma

- **REQ-STT-17:** A interface **deve** estar disponível em português e inglês, com seletor de idioma; a escolha persiste como preferência (REQ-STT-13). Padrão: idioma do navegador se for um dos dois, senão inglês.

## 5. Regras de Negócio

- **RN-STT-01 (jogada direcionada):** a posição da célula jogada dentro do tabuleiro pequeno determina o tabuleiro pequeno onde o adversário deve jogar em seguida.
- **RN-STT-02 (tabuleiro livre):** se o tabuleiro de destino já estiver decidido (vencido ou cheio), o adversário pode jogar em qualquer tabuleiro ainda não decidido.
- **RN-STT-03 (vitória):** vence a partida quem formar linha de 3 tabuleiros pequenos conquistados (horizontal, vertical ou diagonal) no tabuleiro grande.
- **RN-STT-04 (variante de limpeza, configurável, padrão: desligada):** quando ligada, ao conquistar um tabuleiro pequeno todas as jogadas dos demais tabuleiros não decididos são apagadas; tabuleiros já decididos permanecem.
- **RN-STT-05 (desempate, configurável, padrão: maioria vence):** quando nenhuma linha se forma no tabuleiro grande e não há mais jogadas possíveis, aplica-se o critério configurado: (a) maioria vence, quem conquistou mais tabuleiros pequenos ganha, empate real se igual; (b) neutro, tabuleiro pequeno empatado não conta pra ninguém e a partida empata; (c) conta pros dois, tabuleiro empatado vale pros dois na avaliação de linhas.
- **RN-STT-06 (início, configurável):** na criação da partida escolhe-se o símbolo de cada jogador e quem inicia; padrão: quem cria é X e começa.
- **RN-STT-07 (turno):** só o jogador da vez pode jogar; no p2p, jogada recebida fora do turno é rejeitada.
- **RN-STT-08 (imutabilidade da configuração):** nenhuma regra da partida pode ser alterada depois da primeira jogada.

## 6. Critérios de Aceite

**Cenário AC-STT-01: jogada direcionada**
**Dado que** a partida está em andamento e é a vez do jogador X
**Quando** X joga na célula do canto superior esquerdo de um tabuleiro pequeno
**Então** o jogador O só pode jogar no tabuleiro pequeno do canto superior esquerdo, e a UI o destaca.

**Cenário AC-STT-02: jogada inválida rejeitada**
**Dado que** O está obrigado a jogar no tabuleiro central
**Quando** O tenta jogar em outro tabuleiro ou numa célula ocupada
**Então** a jogada é rejeitada, o estado não muda e a vez continua sendo de O.

**Cenário AC-STT-03: destino decidido libera escolha**
**Dado que** a jogada de X aponta pra um tabuleiro já vencido ou cheio
**Quando** chega a vez de O
**Então** O pode jogar em qualquer tabuleiro não decidido.

**Cenário AC-STT-04: vitória no tabuleiro grande**
**Dado que** X já conquistou dois tabuleiros pequenos em linha
**Quando** X conquista o terceiro tabuleiro da mesma linha
**Então** a partida termina com vitória de X, a UI anuncia o resultado e oferece revanche.

**Cenário AC-STT-05: desempate por maioria (padrão)**
**Dado que** o critério de desempate é "maioria vence", não há linha no tabuleiro grande e não restam jogadas
**Quando** a última jogada é feita com X detendo 4 tabuleiros e O detendo 3
**Então** X é declarado vencedor.

**Cenário AC-STT-06: variante de limpeza**
**Dado que** a partida foi criada com a variante de limpeza ligada
**Quando** um jogador conquista um tabuleiro pequeno
**Então** todas as jogadas dos tabuleiros não decididos são apagadas e os tabuleiros decididos permanecem.

**Cenário AC-STT-07: bot respeita dificuldade e regras**
**Dado que** uma partida contra bot em qualquer dificuldade está em andamento
**Quando** é a vez do bot
**Então** o bot faz uma jogada válida segundo as regras configuradas, em tempo perceptivelmente imediato no fácil e médio.

**Cenário AC-STT-08: desfazer contra o bot**
**Dado que** o jogador fez uma jogada e o bot respondeu
**Quando** o jogador aciona desfazer
**Então** as duas jogadas (do bot e do jogador) são desfeitas e a vez volta ao jogador.

**Cenário AC-STT-09: desfazer no p2p exige consentimento**
**Dado que** uma partida p2p está em andamento
**Quando** um jogador pede pra desfazer e o adversário recusa
**Então** nada é desfeito e a partida continua.

**Cenário AC-STT-10: retomada de partida local ou bot**
**Dado que** havia uma partida local ou contra bot em andamento
**Quando** o jogador fecha e reabre o navegador
**Então** o sistema oferece retomar a partida do ponto exato, com histórico e placar da sessão preservados.

**Cenário AC-STT-11: reconexão p2p**
**Dado que** uma partida p2p está em andamento e um jogador perde a conexão
**Quando** ele reabre a página e entra com o mesmo código de sala
**Então** a partida é retomada do ponto em que parou; enquanto isso o adversário vê "aguardando reconexão" com a opção de encerrar.

**Cenário AC-STT-12: sala p2p**
**Dado que** um jogador criou uma sala e recebeu o código
**Quando** o segundo jogador informa o código
**Então** a conexão p2p é estabelecida, a configuração da partida definida pelo criador é exibida a ambos e o jogo começa.

**Cenário AC-STT-13: jogo em celular**
**Dado que** o jogador abre o site num celular
**Quando** a partida está em andamento
**Então** o tabuleiro completo é legível e cada célula é tocável sem zoom.

**Cenário AC-STT-14: troca de idioma**
**Dado que** a interface está em inglês
**Quando** o jogador seleciona português no seletor de idioma
**Então** todos os textos da interface mudam pra português e a escolha é lembrada na próxima visita.

## 7. Fora do Escopo

- Profundidade 3 jogável na UI (super super tictactoe): o motor suporta (REQ-STT-01), mas a interface fica pra demanda futura.
- Contas de usuário, ranking, elo e matchmaking automático: partidas p2p são por código de sala compartilhado manualmente.
- Chat entre jogadores.
- Modo espectador.
- Replay navegável de partidas passadas (o histórico da partida atual, REQ-STT-10, já deixa a base).
- Servidor de sinalização próprio (usa broker público do PeerJS).

## 8. Notas Técnicas

- Stack decidida: React + TypeScript + Vite. O motor de regras fica isolado da UI (sem dependência de React), pra ser testável e reaproveitável em profundidade N.
- Multiplayer via WebRTC (DataChannel) com sinalização pelo broker público gratuito do PeerJS.
- Persistência local via armazenamento do navegador (localStorage ou IndexedDB).
- Testes: Vitest pra motor e bot, Playwright pra interface. CI (GitHub Actions) roda os testes e publica no GitHub Pages a cada push na `main`; teste falhando bloqueia a publicação.
- Nome de exibição do jogo: "Super TicTacToe" (título do site e da aba).
- Direção visual: jogo da velha desenhado à mão, com dois temas: modo claro estilo caderno (papel pautado, traço de caneta) e modo escuro estilo lousa (fundo escuro, traço de giz). Segue a preferência do sistema, com alternância manual.
- O protocolo p2p (mensagens, turnos, reconexão, retomada de sala) terá **Contract Spec própria** antes da etapa E3, com prioridade em ser extremamente leve e robusto: mensagens mínimas, estado reconstituível, tolerância a queda de qualquer um dos lados.
- Roteiro de entrega em etapas, cada uma passando pelo fluxo `implementar-demanda`:
  1. **E1:** motor genérico + modo local + UI responsiva + persistência local (REQ-01..04, 07..14 no que couber, 16).
  2. **E2:** bot com três níveis (REQ-05, AC-07, AC-08).
  3. **E3:** p2p com salas e reconexão (REQ-06, 15, AC-09, 11, 12), precedida pela Contract Spec do protocolo p2p.
