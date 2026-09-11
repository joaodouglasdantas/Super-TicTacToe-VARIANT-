# Guia de Validação — CARTAS

## 1. O que foi entregue

Cada mapa (galáxia, praia) ganhou um baralho próprio de 5 cartas de evento (1 comum, 2 raras, 2 épicas — v2). Vencer um tabuleiro pequeno sorteia uma carta pro vencedor, que decide quando jogá-la (consome a vez, não acumula com jogada normal). O adversário vê só quantas cartas o outro tem, nunca quais. Pré-condição: o modo "Contra o bot" foi removido (entrega anterior a esta).

**v2 (revisão pós-teste do usuário):** Bolha de Proteção virou escudo total (bloqueia jogada normal também, não só carta); o seletor de alvo virou uma grade 3x3 temática no lugar do `<select>` nativo; duas cartas novas — Supernova (galáxia) e Maré Virada (praia) — miram um tabuleiro **já decidido** pra reabri-lo/roubá-lo, o oposto de todas as outras 8.

## 2. Referência da demanda

Spec local: `.specs/CARTAS/spec.md`. Sem card externo — demanda discutida direto no chat, na sequência das specs `.specs/MAPAS/spec.md` e `.specs/NEON/spec.md`.

## 3. Pré-requisitos

Nenhum cadastro ou variável de ambiente. Só rodar o projeto localmente.

O sorteio de mapa (spec MAPAS) e o sorteio de carta são determinísticos a partir do histórico de jogadas — pra validar um mapa específico sem depender de sorte, force antes de começar a partida:

```js
localStorage.setItem('stt.forceMap', 'galaxy'); // ou 'beach'
```

Não existe (nem faz sentido existir) um hook equivalente pra "forçar carta": o sorteio depende de quantas jogadas já aconteceram (`actionCount`) no momento em que o tabuleiro fecha, então basta seguir o roteiro de jogadas abaixo — é sempre o mesmo resultado.

## 4. Como executar

```bash
npm install    # se ainda não rodou
npm run dev    # abre em http://localhost:5173 (ou a porta que o Vite escolher)
```

## 5. Cenários a validar

### 5.1 Vencer um tabuleiro pequeno concede carta ao vencedor
Mapeia: AC-CARTAS-01, REQ-CARTAS-02

Passos:
1. Forçar `galaxy`, começar partida local (Ana/Bia)
2. Jogar: `0.6`, `6.0`, `0.7`, `7.0`, `0.8` (X fecha o tabuleiro 1, linha de cima)

Resultado esperado:
- Depois da 5ª jogada é a vez de Bia (O); o painel "Suas cartas" dela aparece vazio, e ao lado a contagem da Ana mostra `1`
- Bia joga (célula `8.0`, forçada pro tabuleiro 9): a vez volta pra Ana e agora o painel dela mostra 1 carta, nomeada e com ícone

### 5.2 Tabuleiro empatado não concede carta a ninguém
Mapeia: AC-CARTAS-02, REQ-CARTAS-03

Passos:
1. Jogue um tabuleiro pequeno até fechar empatado (sem 3 em linha pra nenhum dos dois)

Resultado esperado:
- Nenhum dos dois jogadores ganha carta; as duas contagens continuam como estavam antes

### 5.3 Jogar uma carta consome a vez e aplica o efeito escolhido
Mapeia: AC-CARTAS-03/04/05/06 (qualquer carta), REQ-CARTAS-04, 06

Passos:
1. Repita 5.1 até a Ana ter "Devorador de Tabuleiro" na mão
2. Clique na carta: um painel de alvo aparece embaixo da mão, com a descrição da carta e um seletor
3. Escolha um tabuleiro na lista e clique "Jogar carta" (ou "Play card")

Resultado esperado:
- O painel de alvo fecha, a vez passa pra Bia (a carta consumiu a jogada, não marcou nada no tabuleiro grande)
- O histórico ganha uma linha nomeando a carta e o alvo (ex.: "Devorador de Tabuleiro — tabuleiro 2")
- O tabuleiro escolhido fica sem o destaque tracejado de "jogável" pra ninguém, mesmo se a regra de encaminhamento mandaria alguém pra lá (RN-CARTAS-02) — confira clicando numa célula dele: fica desabilitada
- A carta some da mão da Ana

### 5.4 Buraco Negro apaga marca do adversário
Mapeia: AC-CARTAS-03

Passos:
1. Consiga "Buraco Negro" na mão (rara do baralho galáxia)
2. Jogue-a escolhendo uma marca do adversário num tabuleiro aberto

Resultado esperado:
- A célula escolhida volta a ficar vazia; a vez passa pro adversário
- No seletor de célula, só aparecem marcas do adversário (nunca as suas, nunca célula vazia)

### 5.5 Estrela da Sorte marca dois tabuleiros ao mesmo tempo
Mapeia: AC-CARTAS-04, RN-CARTAS-05

Passos:
1. Consiga "Estrela da Sorte" (rara do baralho galáxia)
2. Jogue-a: primeiro escolha uma posição (0-8), depois dois tabuleiros diferentes onde essa posição esteja vazia

Resultado esperado:
- A mesma posição é marcada com seu símbolo nos dois tabuleiros escolhidos, numa única jogada
- Se só existe um tabuleiro aberto com aquela posição vazia (ou nenhum), essa posição não aparece pra escolher — a carta nunca fica "meio jogável" (RN-CARTAS-05)

### 5.6 Bolha de Proteção impede carta E jogada normal do adversário no tabuleiro protegido (v2)
Mapeia: AC-CARTAS-06, RN-CARTAS-03

Passos:
1. No mapa praia, um jogador joga "Bolha de Proteção" num tabuleiro seu
2. No mesmo tabuleiro, o adversário tenta jogar qualquer carta que mire um tabuleiro (ex.: Tsunami)
3. Ainda no mesmo tabuleiro, o adversário tenta uma jogada normal (clicar numa célula vazia dele)

Resultado esperado:
- O tabuleiro protegido não aparece na lista de alvos possíveis da carta do adversário
- O tabuleiro protegido também não fica destacado como "jogável" pro adversário — clicar numa célula dele não faz nada (v2: escudo total, mudou do comportamento original que só bloqueava carta)
- Quem protegeu continua jogando normalmente ali, e pode mirar o próprio tabuleiro com as próprias cartas

### 5.7 Online: efeito de carta chega idêntico aos dois lados
Mapeia: AC-CARTAS-07, REQ-CARTAS-11

Passos:
1. Abrir duas abas, criar sala numa e entrar na outra, forçar `galaxy` na aba do host
2. Jogar o roteiro de 5.1 até um lado ter uma carta
3. Jogar a carta num alvo qualquer

Resultado esperado:
- As duas abas mostram exatamente o mesmo tabuleiro depois da jogada de carta (mesmas células, mesmo bloqueio/proteção, mesma vez)
- Do lado de quem não jogou a carta, ela nunca aparece nomeada — só a contagem da mão do outro lado (REQ-CARTAS-07)

### 5.8 Mão cheia (3 cartas) perde a carta nova
Mapeia: AC-CARTAS-08, REQ-CARTAS-05

Passos:
1. Vença tabuleiros pequenos suficientes pro mesmo jogador acumular 3 cartas
2. Vença mais um tabuleiro pequeno com esse jogador

Resultado esperado:
- A contagem de cartas desse jogador continua em 3 (a carta do 4º tabuleiro não aparece, não substitui nenhuma das 3 já na mão)

### 5.9 Desfazer a jogada que concedeu uma carta ainda não jogada remove a carta
Mapeia: AC-CARTAS-09, REQ-CARTAS-10

Passos:
1. Repita 5.1 até a Ana ter uma carta na mão (sem jogá-la)
2. Clique "Desfazer" o suficiente pra voltar antes da jogada que fechou o tabuleiro

Resultado esperado:
- A carta desaparece da mão (some junto com a jogada desfeita que a concedeu)

### 5.10 Desfazer não reverte o efeito de uma carta já jogada
Mapeia: AC-CARTAS-10

Passos:
1. Jogue uma carta com efeito visível (ex.: Buraco Negro apagando uma marca)
2. Clique "Desfazer" (desfaz a própria jogada da carta, que é sempre a mais recente)

Resultado esperado:
- O efeito da carta é desfeito (a marca apagada volta), porque desfazer sempre volta a jogada mais recente primeiro — não existe forma de desfazer a jogada que *concedeu* uma carta já jogada sem antes desfazer a própria jogada da carta (ordem cronológica)

### 5.11 Supernova reabre um tabuleiro já decidido (v2)
Mapeia: AC-CARTAS-11, REQ-CARTAS-12

Passos:
1. No mapa galáxia, feche um tabuleiro pequeno qualquer (vencido por X, O, ou empatado)
2. Consiga "Supernova" na mão (épica) e jogue-a escolhendo esse tabuleiro decidido

Resultado esperado:
- No seletor de tabuleiro da Supernova, só tabuleiros **decididos** aparecem habilitados — os ainda abertos ficam desabilitados (o oposto de toda outra carta de tabuleiro)
- Depois de jogar, o tabuleiro escolhido fica com todas as células vazias e volta a aceitar jogada de qualquer jogador

### 5.12 Maré Virada rouba um tabuleiro vencido pelo adversário (v2)
Mapeia: AC-CARTAS-12, AC-CARTAS-13, REQ-CARTAS-13

Passos:
1. No mapa praia, deixe o adversário vencer um tabuleiro pequeno
2. Consiga "Maré Virada" na mão (épica) e jogue-a escolhendo esse tabuleiro

Resultado esperado:
- No seletor, só tabuleiros vencidos pelo ADVERSÁRIO aparecem — nem os seus próprios vencidos, nem tabuleiros empatados, nem abertos aparecem como opção
- Depois de jogar, as marcas do adversário nesse tabuleiro viram suas; o tabuleiro passa a contar como vitória sua no placar do tabuleiro grande

## 6. Cenários de borda e erro

### 6.1 Bloqueio/proteção contam jogadas da partida inteira, não só daquele tabuleiro
Mapeia: RN-CARTAS-04

Passos: jogue "Devorador de Tabuleiro" num tabuleiro; conte 3 jogadas quaisquer (de qualquer jogador, em qualquer tabuleiro, incluindo jogadas de carta)
Esperado: no início da 4ª jogada depois do bloqueio, o tabuleiro volta a ficar disponível (destaque tracejado reaparece quando é a vez de alguém que seria encaminhado pra lá)

### 6.2 Nenhuma carta jogável fora da vez ou depois do fim
Passos: tente ativar o painel de mão quando não é sua vez, ou depois da partida terminar
Esperado: os botões da mão ficam desabilitados; depois do fim, o painel de cartas nem aparece

### 6.3 Partida salva antes desta entrega (sem cartas) não quebra
Passos: abra uma partida em andamento salva por uma versão anterior (sem `hands`/`actionCount`, ambos derivados do histórico) e retome
Esperado: sem erro no console; a mão de cada jogador é recomputada do zero a partir do histórico salvo (nenhuma jogada de carta nele, então ambas as mãos começam vazias)

## 7. Fora do escopo (NÃO testar)

- Modo "Contra o bot" usando cartas — o modo não existe mais
- Mapas além de galáxia e praia (o limite de "4 cartas por mapa" caiu na v2 — agora são 5)
- Escolher qual carta específica receber — é sempre sorteio por raridade
- Trocar ou descartar cartas manualmente sem jogá-las
- Animação/apresentação elaborada de "revelar carta" — a mão é só ícone + nome + raridade, sem transição especial
- Indicação visual de tabuleiro bloqueado/protegido no GIF exportado — não foi adicionada (o efeito na regra existe, o GIF só não desenha um selo especial pra isso)
- Balanceamento fino das probabilidades (60/30/10) e das durações (3 jogadas)
- Pixel art em qualquer elemento de interface das cartas — usa o mesmo motor vetorial neon do resto da UI

## 8. Como reverter

Sem efeito colateral em dados existentes: `hands` e `actionCount` nunca são persistidos diretamente — só `{config, moves}` (via `serialize`), e são sempre recomputados do zero por `replay()` ao carregar. Uma partida salva por esta versão (com jogadas de carta no histórico) reaberta numa versão anterior ao merge não vai reconhecer os campos `card`/`path2`/`cellIndex` de uma jogada de carta — se isso acontecer, reverter o merge é seguro pra partidas sem cartas jogadas; partidas com cartas já jogadas ficariam incompatíveis com a versão anterior (o motor antigo não sabe interpretar essas jogadas). Basta reverter o merge; não há migration de banco (tudo é `localStorage`).
