# Instruções do Agente: Super TicTacToe

<!--
  ════════════════════════════════════════════════════════════════════════
  CONFIGURAÇÃO INICIAL DA PROMPTARIA. Leia antes de qualquer ação

  Verifique:
    1. Existe um arquivo `.promptaria` na raiz do repo? OU
    2. Este arquivo CLAUDE.md ainda tem placeholders `{{...}}` não preenchidos?

  Se SIM em qualquer dos dois:
    A Promptaria foi instalada mas a configuração interativa ainda não foi
    feita. Dispare IMEDIATAMENTE a skill `.claude/skills/configurar-projeto/SKILL.md`
    antes de qualquer outra ação. Não tente operar com este CLAUDE.md incompleto.
  ════════════════════════════════════════════════════════════════════════
-->

Este repositório usa a **Promptaria** como framework de agente.

## Sobre o projeto

Jogo de Super TicTacToe (jogo da velha em tabuleiros aninhados) jogável no navegador, com dois modos: multiplayer local e multiplayer via web p2p (WebRTC + PeerJS, sem backend próprio). Publicado como site estático no GitHub Pages. Interface bilíngue (português e inglês), visual neon-galáctico com mapas sorteados por partida (galáxia e praia, spec `MAPAS`). A spec fundadora é a `STT` (em `.specs/STT/spec.md`), com entrega em etapas: E1 motor + local, E2 bot (removido depois, ver `.specs/REMOVER-BOT/spec.md`), E3 p2p.

## Stack

- Frontend: React + TypeScript + Vite (SPA estática, sem backend)
- Multiplayer: WebRTC DataChannel com sinalização via broker público do PeerJS
- Persistência: armazenamento do navegador (localStorage/IndexedDB)
- Testes: Vitest (unitários, motor e p2p) + Playwright (interface)
- Deploy: GitHub Actions builda, roda os testes e publica no GitHub Pages a cada push na `main` (teste falhando bloqueia a publicação)

<!-- Exemplo de formato (substitua pelo real durante configurar-projeto):
- Backend: Java 21 + Spring Boot 3.x
- Frontend: Next.js 14 (App Router) + TypeScript
- Banco: PostgreSQL 16, migrations com Flyway
- Testes: JUnit 5 (back), Vitest + Playwright (front)
-->

## Como rodar localmente

- `npm install` na primeira vez
- `npm run dev` sobe o Vite em modo desenvolvimento
- `npm run build` gera o site estático em `dist/` (o mesmo que o CI publica)

## Como testar

- `npm test` roda os unitários (Vitest): motor de regras e protocolo p2p
- `npm run test:ui` roda os testes de interface (Playwright)
- O CI roda ambos em todo push; publicação no Pages só acontece com tudo verde

## Estrutura

- `src/engine/`: motor de regras em TypeScript puro (recursivo, profundidade N). **Não pode importar React nem nada de UI.**
- `src/i18n/`: textos em português e inglês e detecção de idioma
- `src/storage/`: persistência em localStorage (preferências, partida em andamento)
- `src/ui/`: componentes React (App, SetupScreen, GameScreen, BoardView) e temas CSS (caderno/lousa)
- `tests/engine/`: unitários Vitest do motor (cada AC da spec vira teste nomeado)
- `tests/e2e/`: Playwright (fluxos de interface)
- `.github/workflows/ci.yml`: testes + deploy no Pages

## Padrão de commit

Conventional Commits com descrição em português (mesmo padrão do WS-AutoBot):

- Formato: `tipo(escopo): descrição em português, minúscula, sem ponto final`
- Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`, `perf`
- Escopo em minúsculas, curto, nomeando o módulo ou tema (ex: `feat(tabuleiro): ...`)
- Descrição narrativa: dizer o que mudou e, quando couber, por quê (ex: `fix(cli): wsbot status quebrava com UnboundLocalError`)

## Padrão de branch

Só `main`, commit direto. Projeto solo, sem branches de feature nem PR: a entrega é validada localmente e commitada na `main` após aprovação. Os Guias de Validação e de Contexto Técnico continuam obrigatórios, mas vão em `.specs/{DEMANDA}/` em vez de descrição de PR.


## Como receber uma demanda

Quem solicita cola o texto da demanda no chat (geralmente vindo de ClickUp/Jira/Linear). A demanda pode chegar em formatos diferentes. A Promptaria opera sob o princípio **SDD (Spec-Driven Development)**: a precisão da spec determina a qualidade da entrega.

### Formatos reconhecidos

A demanda colada pode ser uma de quatro **specs formais** ou texto livre. Reconheça pelo conteúdo:

| Formato | Sinais de reconhecimento | Trate como |
|---|---|---|
| **História de Usuário** | "Como [papel], Quero [ação], Para [benefício]"; códigos `REQ-XXX-NN`, `RN-XXX-NN`, `AC-XXX-NN` em BDD (Dado/Quando/Então) | Comportamento com usuário final |
| **Feature Spec** | "Propósito Técnico", "Contrato Público", códigos `REQ-XXX-NN`, `RT-XXX-NN`, `AC-XXX-NN` | Módulo/feature técnica interna |
| **Experiment Plan** | "Hipótese", códigos `HIP-XXX-NN`, `CS-XXX-NN`, `CF-XXX-NN`, "Procedimento" | PoC ou validação de hipótese |
| **Contract Spec** | "Schema", "Partes (publisher/consumers)", códigos `CL-XXX-NN`, `GAR-XXX-NN` | Definição de contrato (API, evento, schema) |
| **Texto livre** | Bullets soltos, linguagem natural, sem códigos ou estrutura formal | Spec incompleta, aplicar precisão antes de codar |

> **Referência completa dos formatos e dos códigos** (REQ, RN, AC, RT, HIP, CS, CF, CL, GAR): veja [`.claude/processos/specs.md`](.claude/processos/specs.md). Leia esse arquivo sob demanda quando precisar reconhecer uma spec colada OU construir uma do zero.

### Princípio operacional

> **Quanto mais formal a spec, mais o agente respeita os códigos como contrato.**
> **Quanto mais livre o texto, mais o agente exige precisão antes de partir pro código.**

Caminhos possíveis:

1. **Spec formal colada** → usa [`implementar-demanda`](.claude/skills/implementar-demanda/SKILL.md) diretamente
2. **Texto livre vago** → oferece [`formular-spec`](.claude/skills/formular-spec/SKILL.md) pra construir a spec primeiro; depois implementa
3. **Texto livre suficiente** → segue `implementar-demanda` aplicando teste de precisão; se travar, recua pra `formular-spec`

Em todos os casos: **não invente requisito**.

## Regras inegociáveis (Promptaria, universais)

> Regras universais do framework. NÃO editar (são fundação). Pra regras específicas deste projeto, ver [`.claude/regras-projeto.md`](.claude/regras-projeto.md).

- **Nunca invente requisito.** Demanda vaga → pergunta antes de codar.
- **Nunca commite sem aprovação.** Sempre apresente o plano de commit e espere OK.
- **Sempre rode os testes** antes de declarar uma tarefa concluída.
- **Nunca pule hooks de pre-commit** (`--no-verify`) sem permissão explícita.
- **PR sempre** com base na branch definida na seção `Padrão de branch` deste arquivo.
- **Se a demanda tem códigos formais** (REQ, RN, AC, RT, HIP, CS, CF, CL, GAR), trate-os como **contrato**. Cada código deve aparecer rastreável no plano, na implementação e nos testes.
- **Toda entrega exige Guia de Validação E Guia de Contexto Técnico.** Sem ambos, a tarefa NÃO está pronta. Vão junto na descrição do PR (Validação primeiro, Contexto Técnico abaixo) e, recomendado, no comentário do card. O de Validação fala com quem testa; o de Contexto Técnico fala com quem revisa código ou faz manutenção depois. Formatos em [`.claude/templates/guia-validacao.md`](.claude/templates/guia-validacao.md) e [`.claude/templates/guia-contexto-tecnico.md`](.claude/templates/guia-contexto-tecnico.md). Aplica-se a tudo: feature, bugfix, refactor, ajuste de config.
- **Nunca publique nada externo por iniciativa própria.** Sem `git push`, sem `gh pr create`, sem `gh pr comment`. Prepare tudo copy-paste e instrua quem solicitou a executar.

## Regras inegociáveis do projeto

Consulte [`.claude/regras-projeto.md`](.claude/regras-projeto.md). Esse arquivo é populado pela skill `configurar-projeto` durante a instalação e é mantido pelo time. Toda regra lá tem o mesmo peso das universais acima.

## Aprendizados do projeto

> Conhecimento coletivo do time sobre comportamento do projeto. **Cada item aqui é algo que o agente já errou antes (e que o time corrigiu) pra não cair na mesma armadilha de novo.**
>
> Adicionado pela skill `gerenciar-memoria` quando uma descoberta vale pra todo mundo (vs algo só seu, que vai pra `.claude/memory/`). Mantenha enxuto, poucos e bons. Se virar enxurrada, sinal pra refatorar (virar regra de projeto, ou virar comentário no código).

### Domínio

<!--
  Termos, jargões, regras de negócio do cliente que o agente costuma confundir.
  Exemplo:
  - **"Beneficiário" ≠ titular:** no jargão do cliente, "beneficiário" é o paciente que usa o plano, não quem assinou o contrato.
-->

_(nenhum aprendizado registrado ainda)_

### Convenção implícita

<!--
  Padrões do código que não estão em ADR/doc mas todo mundo segue.
  Exemplo:
  - **Endpoints de admin sempre `/admin/v1/`:** não documentado, mas padrão do código existente. Agente já criou `/api/v1/admin/` errado antes.
-->

_(nenhum aprendizado registrado ainda)_

### Gotcha técnico

<!--
  Pegadinhas do projeto que custam tempo descobrir sozinho.
  Exemplo:
  - **Cache invalida só em deploy, não em restart:** reiniciar o serviço local NÃO limpa cache. Use `make cache:clear` antes de testar.
-->

_(nenhum aprendizado registrado ainda)_

## Skills disponíveis

- [configurar-projeto](.claude/skills/configurar-projeto/SKILL.md): configuração inicial guiada do CLAUDE.md (preenche stack, como rodar, etc.). Dispara automaticamente na primeira execução após instalar a Promptaria.
- [formular-spec](.claude/skills/formular-spec/SKILL.md): construir uma spec (História, Feature, Experimento, Contrato) interativamente a partir de demanda crua. Útil quando não vem spec pronta.
- [implementar-demanda](.claude/skills/implementar-demanda/SKILL.md): fluxo completo. Reconhecer formato → planejar → implementar → testar → gerar guia de validação → entregar bloco copy-paste pra abrir PR.
- [validar-entrega](.claude/skills/validar-entrega/SKILL.md): gerar Guia de Validação pra trabalho feito por terceiro (outra pessoa, outro time). Útil pra quem recebe PR sem roteiro de teste e precisa produzir um.
- [gerenciar-memoria](.claude/skills/gerenciar-memoria/SKILL.md): salvar/atualizar/consultar memórias locais do projeto em `.claude/memory/`. Use ao descobrir convenção/decisão/gotcha que vai ser útil em sessões futuras.

> **Referência de formatos de spec:** [`.claude/processos/specs.md`](.claude/processos/specs.md)
> **Memórias acumuladas deste projeto:** [`.claude/memory/MEMORY.md`](.claude/memory/MEMORY.md) (índice; leia no início de tarefas relevantes; carregue memórias individuais sob demanda)
