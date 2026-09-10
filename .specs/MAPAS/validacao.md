# Guia de Validação — MAPAS

## 1. O que foi entregue

Cada partida nova (local, contra o bot ou online) agora sorteia sozinha um "mapa" visual entre galáxia (o tema neon já existente) e o novo mapa praia (paleta aquática, mesmo brilho neon, criaturas próprias). O jogador não escolhe. Numa sala online os dois lados sempre veem o mesmo mapa. O mapa escolhido é preservado ao retomar, no replay, na exportação/importação e no GIF baixado.

## 2. Referência da demanda

Spec local: `.specs/MAPAS/spec.md`. Sem card externo — demanda discutida direto no chat, na sequência da spec `.specs/NEON/spec.md`.

## 3. Pré-requisitos

Nenhum cadastro ou variável de ambiente. Só rodar o projeto localmente.

Como o sorteio é aleatório, pra validar um mapa específico sem depender de sorte, abra o console do navegador **antes** de começar uma partida nova e rode:

```js
localStorage.setItem('stt.forceMap', 'beach'); // ou 'galaxy'
```

Isso força o próximo sorteio (é o mesmo hook que os testes automatizados usam). Pra voltar ao sorteio normal: `localStorage.removeItem('stt.forceMap')`.

## 4. Como executar

```bash
npm install    # se ainda não rodou
npm run dev    # abre em http://localhost:5173
```

## 5. Cenários a validar

### 5.1 Partida local sorteia um mapa sem o jogador escolher
Mapeia: AC-MAPAS-01

Passos:
1. Abrir a home, clicar em "2 jogadores", "Começar"
2. Observar o visual do tabuleiro

Resultado esperado:
- Não existe nenhum controle pra escolher mapa em lugar nenhum da interface
- O visual é ou o roxo/ciano da galáxia (estrelas, criaturas alienígenas) ou o aquático da praia (água, peixes) — nunca um terceiro visual nem uma mistura dos dois

### 5.2 Host e guest online veem o mesmo mapa
Mapeia: AC-MAPAS-02, REQ-MAPAS-03

Passos:
1. Numa aba, `localStorage.setItem('stt.forceMap', 'beach')`, criar uma sala ("Criar sala")
2. Copiar o código, abrir outra aba (ou navegador anônimo) **sem** forçar nada, entrar na sala com o código
3. Comparar o visual das duas abas depois que a partida começa

Resultado esperado:
- As duas abas mostram o mapa praia, idêntico (mesma paleta, mesmas criaturas)

### 5.3 Retomar uma partida mantém o mapa
Mapeia: AC-MAPAS-03, REQ-MAPAS-04

Passos:
1. Forçar `beach`, começar uma partida local, fazer uma jogada
2. Recarregar a página (F5)
3. Clicar em "Retomar" no diálogo que aparece

Resultado esperado:
- O visual continua praia, não sorteia de novo (mesmo se você trocar o `stt.forceMap` antes de recarregar)

### 5.4 Revanche mantém o mapa da partida anterior
Mapeia: AC-MAPAS-07, REQ-MAPAS-06

Passos:
1. Forçar `beach`, jogar uma partida local até o fim
2. Clicar em "Revanche"

Resultado esperado:
- A nova partida continua no mapa praia (não sorteia de novo)

### 5.5 Mapa praia tem paleta e criaturas próprias, mesmo brilho da galáxia
Mapeia: AC-MAPAS-05, REQ-MAPAS-07

Passos:
1. Forçar `beach`, começar uma partida
2. Olhar o tabuleiro, o fundo e o cabeçalho

Resultado esperado:
- Fundo em tons de água (verde-azulado escuro), X em laranja/coral, O em turquesa, linhas do tabuleiro em dourado
- Bolhas subindo e criaturas aquáticas (peixe, água-viva, cavalo-marinho) flutuando no fundo, com o mesmo brilho neon do mapa galáxia (não é pixel-art, não é um estilo visual diferente)

### 5.6 GIF exportado reflete o mapa daquela partida
Mapeia: AC-MAPAS-06, REQ-MAPAS-04

Passos:
1. Forçar `beach`, jogar uma partida até o fim
2. Baixar o GIF (botão que aparece ao terminar, ou pela biblioteca → replay)
3. Abrir o GIF baixado

Resultado esperado:
- O fundo e as cores do GIF são os do mapa praia (água), não os da galáxia

## 6. Cenários de borda e erro

### 6.1 Partida salva antes desta entrega (sem campo de mapa)
Mapeia: AC-MAPAS-04, REQ-MAPAS-05

Passos:
1. Começar uma partida local, fazer uma jogada
2. No console: ler `localStorage.getItem('stt.match')`, remover o campo `"map"` do JSON e salvar de volta com `localStorage.setItem('stt.match', <json editado>)`
3. Recarregar e clicar em "Retomar"

Resultado esperado:
- Nenhum erro no console
- A partida retomada aparece no mapa galáxia (padrão de segurança)

### 6.2 Importar um arquivo de partida exportado antes desta entrega
Passos: repetir 6.1, mas exportando a partida (gera o `.json`), editando o arquivo pra remover `"map"`, e importando de volta pela biblioteca
Esperado: importa sem erro, mostra o replay no mapa galáxia

## 7. Fora do escopo (NÃO testar)

- Sistema de cartas (buracos negros, tabuleiros indisponíveis, etc.) — ainda não implementado, fica pra uma spec própria
- Mais mapas além de galáxia e praia
- Qualquer forma do jogador escolher o mapa manualmente
- Som diferente por mapa (o som sintetizado continua igual nos dois)
- Qualquer mudança de regra de jogo — nenhuma regra do motor (`src/engine/`) mudou

## 8. Como reverter

Sem efeito colateral em dados existentes: os campos novos (`map` em partida salva, sala salva, biblioteca) sempre têm um valor padrão (`galaxy`) quando ausentes. Basta reverter o merge — partidas salvas por esta versão continuam abrindo normalmente em uma versão anterior (o campo `map` extra é simplesmente ignorado pelo código antigo).
