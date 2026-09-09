# Guia de Validação — NEON: Redesign visual e sonoro neon-galáctico

## 1. O que foi entregue

Redesign completo do tema visual (neon-galáctico, tema único sempre escuro, com estrelas/partículas/criaturinhas decorativas) e troca dos efeitos sonoros de jogada — de gravações reais de giz/lápis para sons sintetizados por código — removendo a alternância claro/escuro e toda a identidade "caderno/lousa" do fork original.

## 2. Referência da demanda

Spec local: [`.specs/NEON/spec.md`](spec.md) (projeto sem tracker externo — ClickUp/Jira/Linear).

## 3. Pré-requisitos

- Nenhum login/cadastro necessário.
- `npm install` (primeira vez) e `npm run dev` pra rodar localmente.
- Navegador com áudio permitido (o som só libera após a primeira interação, como já era antes).
- Sem variável de ambiente nova, sem migration.

## 4. Como executar

- `npm run dev` e abrir a URL local (ex.: `http://localhost:5173/`).
- Ou testar o build de produção: `npm run build && npm run preview`.

## 5. Cenários a validar

### 5.1 Tema único, sempre escuro (AC-NEON-01)
Passos:
1. Abrir o jogo.
2. Clicar no ícone de engrenagem (⚙️) no cabeçalho, abrindo "Configurações".

Resultado esperado:
- Não existe mais alternador de tema (nenhum controle "Caderno"/"Lousa" nem ícone de sol/lua) — só os controles de Idioma e Som.
- O fundo é sempre escuro, com estrelas e brilho neon, em qualquer aba/navegador/horário do dia.

### 5.2 Sons de jogada sintetizados, sem rede (AC-NEON-02)
Passos:
1. Abrir o DevTools → aba Network, filtrar por "sounds".
2. Iniciar uma partida local (2 jogadores) e fazer algumas jogadas alternando X e O.

Resultado esperado:
- Um som curto ("blip") toca a cada jogada.
- Nenhuma requisição aparece na aba Network filtrada por "sounds" (o som não depende mais de arquivo).
- Fechar um tabuleiro pequeno, e depois a partida inteira: cada risco toca um som mais quente e mais longo (mini-acorde de duas notas) que o clique de uma jogada comum.

### 5.3 Desfazer continua silencioso (AC-NEON-03)
Passos:
1. Fazer uma jogada (ouvir o som).
2. Clicar em "Desfazer" (Undo).

Resultado esperado:
- Nenhum som toca ao desfazer (RN-SOM-05, comportamento preexistente mantido).

### 5.4 Créditos de som removidos (AC-NEON-04)
Passos:
1. Abrir o modal de informações (ícone ℹ️).

Resultado esperado:
- O modal mostra título, descrição e link do repositório, mas não mostra mais nenhuma seção "Créditos de som" — não há mais gravação de terceiro a atribuir.

### 5.5 Fundo decorativo nunca atrapalha clique (AC-NEON-05)
Passos:
1. Observar o fundo do jogo (estrelas cintilando, partículas de luz subindo, 3 criaturinhas flutuando devagar pela tela).
2. Iniciar uma partida local e clicar em várias células do tabuleiro, inclusive perto das bordas da tela, mesmo quando uma criaturinha/partícula estiver visualmente por cima.

Resultado esperado:
- Todo clique registra a jogada normalmente, sem exceção.
- Nenhum elemento decorativo reage a clique/hover (não é interativo).

### 5.6 `prefers-reduced-motion` reduz a animação decorativa (AC-NEON-06)
Passos:
1. No Chrome DevTools: `Ctrl+Shift+P` → "Rendering" → "Emulate CSS media feature prefers-reduced-motion" → `reduce` (alternativa: ativar "reduzir movimento" nas preferências do sistema operacional).
2. Recarregar a página.

Resultado esperado:
- Estrelas, partículas e criaturinhas ficam paradas (sem cintilar/flutuar); o resto do jogo funciona normal.
- O risco de vitória continua reduzido nessa configuração (comportamento que já existia antes desta entrega).

### 5.7 Estilo visual em todas as telas (REQ-NEON-01..05)
Passos:
1. Percorrer home, partida local, partida contra o bot, sala online, biblioteca e replay.

Resultado esperado:
- Fundo sempre escuro/roxo-azulado com estrelas e partículas em todas as telas.
- Marcas X (magenta) e O (ciano) e a grade do tabuleiro grande com brilho neon visível.
- Título e destaques em fonte "quadrada"/futurista (Orbitron); texto em geral numa fonte técnica legível (Rajdhani). Nenhum texto usa mais a fonte cursiva antiga.
- Não há mais traço tremido de giz/lápis nem linhas de caderno no fundo.

### 5.8 GIF exportado usa o novo visual (REQ-NEON-08)
Passos:
1. Terminar uma partida.
2. Clicar em "Baixar GIF".

Resultado esperado:
- O `.gif` baixado abre com fundo escuro neon (não mais papel claro nem lousa antiga), linhas retas com leve brilho (sem tremido), e a fonte nova nos textos "X"/"O"/resultado.

## 6. Cenários de borda e erro

### 6.1 Som desligado
Passos: nas Configurações, ligar "Som desligado" (mute); fazer jogadas.
Esperado: nenhum som toca; nenhum erro no console.

### 6.2 Áudio antes do primeiro clique
Passos: abrir o jogo e checar o console antes de clicar em qualquer lugar.
Esperado: nenhum erro relacionado a `AudioContext`; o primeiro som só toca depois da primeira interação (REQ-SOM-07, preexistente).

### 6.3 Preferência antiga de tema no `localStorage`
Passos: no console do navegador, simular um usuário que já tinha a preferência antiga salva:
```js
const p = JSON.parse(localStorage.getItem('stt.prefs') || '{}');
localStorage.setItem('stt.prefs', JSON.stringify({ ...p, theme: 'dark' }));
```
Recarregar a página.
Esperado: o jogo carrega normalmente, sempre no tema neon único, sem erro no console; o campo `theme` órfão fica ignorado.

## 7. Fora do escopo (NÃO testar)

- Música de fundo (loop lofi contínuo durante a partida) — fica para uma entrega futura.
- Redesenho do favicon/ícone do site.
- Qualquer mudança de regra de jogo, bot, conexão P2P ou fluxo de telas (menu, setup, biblioteca) além da troca de estilo visual/sonoro.
- Efeitos sonoros para ações de interface (abrir menu, trocar configuração) — continuam silenciosas (RN-SOM-02, mantida).

## 8. Como reverter

Sem efeito colateral em dados: basta reverter o(s) commit(s) desta entrega (não há migration nem alteração de schema — o projeto usa só `localStorage`). Único resíduo possível: o campo `theme`, que pode ter ficado salvo no `localStorage` de quem já usou a versão anterior — inofensivo e já coberto pelo cenário 6.3.
