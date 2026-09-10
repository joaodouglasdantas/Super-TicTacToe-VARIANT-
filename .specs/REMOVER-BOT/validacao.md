# Guia de Validação — REMOVER-BOT

## 1. O que foi entregue

O modo "Contra o bot" saiu do jogo por completo: botão, seletor de dificuldade, motor de IA (`src/bot/`) e todos os textos exclusivos dele. O jogo agora tem só dois modos: dois jogadores (local) e multiplayer via web. Dado salvo de antes (partida, biblioteca, arquivo exportado) com `mode: 'bot'` continua abrindo normalmente, tratado como local.

## 2. Referência da demanda

Spec local: `.specs/REMOVER-BOT/spec.md`. Pré-condição combinada da spec `.specs/CARTAS/spec.md` (sistema de cartas, ainda não implementado).

## 3. Pré-requisitos

Nenhum. Só rodar o projeto localmente.

## 4. Como executar

```bash
npm install    # se ainda não rodou
npm run dev    # abre em http://localhost:5173
```

## 5. Cenários a validar

### 5.1 Botão do bot sumiu da home
Mapeia: AC-REMOVERBOT-01

Passos: abrir a home.
Esperado: aparecem só "Criar sala" e "2 jogadores" (cheios, um embaixo do outro). Nenhum botão "1 jogador"/"Contra o bot".

### 5.2 Partida local funciona normal
Passos: clicar "2 jogadores", preencher os dois nomes, "Começar", jogar algumas jogadas.
Esperado: fluxo idêntico a antes (mapa sorteado, som, tabuleiro) — só o bot que não existe mais.

### 5.3 Partida salva de antes da remoção (com `mode: 'bot'`) ainda abre
Mapeia: AC-REMOVERBOT-03

Passos:
1. Console do navegador, antes de abrir o jogo: `localStorage.setItem('stt.match', JSON.stringify({ game: { config: { depth: 2, clearVariant: false, tiebreak: 'majority', startingPlayer: 'X' }, moves: [{ player: 'X', path: [4,4] }] }, playerNames: ['Ana',''], player1Symbol: 'X', score: { X: 0, O: 0, draws: 0 }, mode: { type: 'bot', difficulty: 'medium', humanSymbol: 'X' }, map: 'galaxy' }))`
2. Abrir/recarregar o jogo

Esperado: aparece o diálogo de retomar partida, sem erro no console; ao retomar, o tabuleiro mostra a jogada salva, tratado como partida local (sem nenhuma referência a bot/dificuldade em lugar nenhum).

### 5.4 Idioma inglês também sem menção a bot
Passos: trocar idioma pra EN (engrenagem → Idioma), navegar pela home e pelo modal de informações.
Esperado: nenhum texto em inglês menciona "bot" (nem "Against the bot", nem "Bot difficulty").

## 6. Cenários de borda e erro

### 6.1 Biblioteca com entrada antiga de partida contra o bot
Passos: repetir 5.3, mas terminando a partida antes de salvar em `stt.library` em vez de `stt.match` (ou simplesmente jogar uma partida local nova até o fim, depois editar a entrada em `localStorage['stt.library']` trocando `"mode":"local"` por `"mode":"bot"`), depois abrir a Biblioteca.
Esperado: a entrada aparece normal na lista (biblioteca nunca exibiu o campo "modo" mesmo antes), replay abre sem erro.

## 7. Fora do Escopo (NÃO testar)

- Qualquer funcionalidade de IA/bot — foi removida, não deve existir em lugar nenhum.
- Sistema de cartas (spec `CARTAS`) — ainda não implementado, esta entrega só é a pré-condição dele.
- Limpeza ativa de dados antigos no `localStorage` — dado velho com `mode: 'bot'` não é apagado, só deixa de ser tratado como bot.

## 8. Como reverter

Sem efeito colateral em dados existentes (dado antigo com `mode: 'bot'` continua íntegro no `localStorage`, só passa a ser lido como local). Basta reverter o merge — o motor de IA volta junto, nada foi alterado nele.
