# Super TicTacToe — Neon Galaxy

Jogo da velha em tabuleiros aninhados, jogável no navegador: nove tabuleiros pequenos dentro de um grande, onde cada jogada manda o adversário pro tabuleiro correspondente à célula jogada.

Esse repositório é meu fork pessoal do [Super TicTacToe original](https://github.com/BrennoKM/Super-TicTacToe), com identidade visual e sonora própria: tema neon-galáctico (fundo escuro, estrelas, partículas de luz, criaturinhas flutuando, brilho neon nas marcas e no tabuleiro) no lugar do caderno/quadro-negro original, e efeitos sonoros sintetizados no lugar de gravações de giz/lápis. As regras, os modos de jogo e a engine continuam as mesmas — mudou a roupa, não o motor.

**Jogue agora: <https://joaodouglasdantas.github.io/Super-TicTacToe-VARIANT-/>**

## Modos de jogo

- **Dois jogadores (local):** alternando no mesmo dispositivo
- **Multiplayer via web:** partidas p2p por código de sala (WebRTC), sem servidor próprio, com reconexão automática após queda de conexão

## Regras

Regras clássicas do Super TicTacToe, com opções configuráveis por partida:

- **Jogada direcionada:** a posição da célula jogada define o tabuleiro onde o adversário joga em seguida; se o destino já estiver decidido, a jogada é livre
- **Vitória:** linha de três tabuleiros pequenos conquistados no tabuleiro grande
- **Variante de limpeza** (opcional): conquistar um tabuleiro apaga as jogadas dos tabuleiros ainda em aberto
- **Desempate configurável:** maioria de tabuleiros vence (padrão), empatado não conta pra ninguém, ou empatado conta pros dois
- **Início configurável:** símbolo de cada jogador e quem começa

Também tem desfazer (com consentimento do adversário no online), revanche com iniciante alternado, placar da sessão, histórico de jogadas e interface em português e inglês.

## Identidade visual e sonora

- **Tema único, sempre escuro:** sem alternância claro/escuro — fundo profundo com estrelas cintilantes, partículas de luz subindo e criaturinhas espaciais flutuando ao fundo (tudo decorativo, nunca atrapalha um clique)
- **Brilho neon:** marcas X/O, linhas do tabuleiro e o risco da vitória com glow nas cores do tema (magenta e ciano)
- **Ícones em SVG próprio:** sem depender de emoji do sistema, pra manter consistência visual entre navegadores
- **Som sintetizado:** blips e acordes curtos gerados por Web Audio (sem gravação, sem licença de terceiro), com a mesma fila anti-sobreposição de sempre — nada de jogada se atropelando

## Rodando localmente

Requisitos: Node.js 22+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

## Testes

```bash
npm test           # unitários (Vitest): motor de regras e protocolo p2p
npm run test:ui    # interface (Playwright); antes: npx playwright install chromium
npm run typecheck  # TypeScript
```

## Arquitetura

- `src/engine/`: motor de regras em TypeScript puro, recursivo (suporta profundidade N; a UI expõe o clássico de 2 níveis). Não depende de React nem de nada de UI.
- `src/p2p/`: multiplayer online em três camadas: protocolo (mensagens e validação), sessão (agnóstica de transporte) e transportes (PeerJS em produção, BroadcastChannel nos testes)
- `src/audio/`: decisão de quais sons uma jogada produz (camada pura, testável) e a síntese/fila de reprodução via Web Audio
- `src/ui/`: componentes React, ícones SVG (`icons.tsx`), fundo decorativo (`CosmicBackground.tsx`) e o tema CSS neon-galáctico
- `src/i18n/` e `src/storage/`: textos pt/en e persistência em localStorage
- `tests/engine/`, `tests/p2p/`, `tests/replay/`, `tests/e2e/`: unitários e ponta a ponta

O estado de uma partida é sempre redutível a `{configuração, jogadas}` e reconstruído por replay determinístico do motor. É isso que torna baratos o desfazer, a retomada após fechar o navegador e a reconexão p2p (os dois lados trocam históricos e o mais longo válido prevalece).

## Deploy

GitHub Actions roda typecheck, unitários e testes de interface em todo push; na `main`, com tudo verde, publica o build no GitHub Pages. Teste falhando bloqueia a publicação.

Se for dar fork neste fork: confira se `VITE_BASE` em `.github/workflows/ci.yml` bate com o nome do seu repositório (`/nome-do-repo/`), e habilite o GitHub Actions na aba **Actions** do seu fork — ele vem desativado por padrão em todo fork novo, e sem isso o Pages fica servindo os arquivos-fonte crus em vez do build.

## Processo

O desenvolvimento segue a [Promptaria](https://github.com/BrennoKM/Promptaria): specs com códigos rastreáveis (REQ, RN, AC), implementação com rastreabilidade código a código e Guias de Validação e de Contexto Técnico a cada entrega. As specs deste projeto ficam versionadas em [`.specs/`](.specs/).
