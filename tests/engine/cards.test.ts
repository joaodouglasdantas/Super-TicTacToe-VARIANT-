import { describe, expect, it } from 'vitest';
import {
  allowedBoards,
  applyAction,
  applyCard,
  applyMove,
  CARD_DECKS,
  cardMap,
  cardRarity,
  createBoard,
  createGame,
  drawCard,
  getNode,
  isLocked,
  undo,
  validateCard,
} from '../../src/engine';
import type { Board, CardId, GameConfig, GameState, Move } from '../../src/engine';
import { X_WINS_TOP_ROW } from './fixtures';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
  map: 'galaxy',
};

const beach: GameConfig = { ...classic, map: 'beach' };

describe('sorteio de carta (REQ-CARTAS-01, 02, 08, 09)', () => {
  it('vencer um tabuleiro pequeno concede uma carta do baralho do mapa', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(state.hands.X).toHaveLength(1);
    expect(CARD_DECKS.galaxy.map((c) => c.id)).toContain(state.hands.X[0]);
    expect(state.hands.O).toHaveLength(0);
  });

  it('mapa praia sorteia do próprio baralho', () => {
    let state = createGame(beach);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(CARD_DECKS.beach.map((c) => c.id)).toContain(state.hands.X[0]);
  });

  it('tabuleiro empatado não concede carta (AC-CARTAS-02)', () => {
    let state = createGame(classic);
    const board0 = getNode(state.board, [0]) as Board;
    // X O X / X O O / O X _  — completo sem linha; falta só a célula 8 (vez de X).
    board0.cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null];
    state = { ...state, forcedPath: [0] };
    state = applyMove(state, [0, 8]);
    expect(getNode(state.board, [0, 8])).toBe('X');
    expect((getNode(state.board, [0]) as Board).cells).not.toContain(null);
    expect(state.hands.X).toHaveLength(0);
  });

  it('mão cheia (3) perde a carta nova, sem substituir as que já tinha (REQ-CARTAS-05, AC-CARTAS-08)', () => {
    let state = createGame(classic);
    const already = ['salto-estelar', 'buraco-negro', 'estrela-da-sorte'] as const;
    state = { ...state, hands: { ...state.hands, X: [...already] } };
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(state.hands.X).toEqual(already);
  });

  it('sorteio é determinístico: mesma semente, mesma carta (REQ-CARTAS-11)', () => {
    expect(drawCard('galaxy', 7)).toBe(drawCard('galaxy', 7));
    expect(drawCard('beach', 42)).toBe(drawCard('beach', 42));
  });

  it('cardMap/cardRarity refletem o baralho de cada mapa', () => {
    expect(cardMap('tsunami')).toBe('beach');
    expect(cardMap('devorador-de-tabuleiro')).toBe('galaxy');
    expect(cardRarity('salto-estelar')).toBe('common');
    expect(cardRarity('devorador-de-tabuleiro')).toBe('epic');
  });
});

describe('salto estelar (comum, galáxia): ignora o encaminhamento', () => {
  it('marca em tabuleiro fora do forçado, e a jogada normal lá seria recusada', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]); // O é mandado pro tabuleiro 4
    state = { ...state, hands: { ...state.hands, O: ['salto-estelar'] } };
    // Sem a carta, jogar no tabuleiro 0 (não é o 4) seria inválido.
    const move: Move = { player: 'O', card: 'salto-estelar', path: [0, 0] };
    expect(validateCard(state, move)).toBeNull();
    const after = applyCard(state, move);
    expect(getNode(after.board, [0, 0])).toBe('O');
    expect(after.hands.O).toHaveLength(0);
    expect(after.currentPlayer).toBe('X');
  });
});

describe('buraco negro (rara, galáxia): apaga marca do adversário', () => {
  it('apaga só marca do adversário, num tabuleiro ainda aberto', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]); // X marca 4.4
    state = applyMove(state, [4, 0]); // O marca 4.0, X vai pro 0
    state = { ...state, hands: { ...state.hands, X: ['buraco-negro'] } };
    const move: Move = { player: 'X', card: 'buraco-negro', path: [4, 0] };
    expect(validateCard(state, move)).toBeNull();
    const after = applyCard(state, move);
    expect(getNode(after.board, [4, 0])).toBeNull();
  });

  it('não pode apagar a própria marca nem célula vazia', () => {
    let state = createGame(classic);
    state = applyMove(state, [4, 4]); // X marca 4.4
    state = applyMove(state, [4, 0]); // O marca 4.0, X vai pro 0
    state = { ...state, hands: { ...state.hands, X: ['buraco-negro'] } };
    // X tentando apagar a própria marca (4.4): inválido.
    expect(
      validateCard(state, { player: 'X', card: 'buraco-negro', path: [4, 4] }),
    ).toBe('alvo-invalido');
    // X tentando apagar uma célula vazia (4.1): inválido.
    expect(
      validateCard(state, { player: 'X', card: 'buraco-negro', path: [4, 1] }),
    ).toBe('alvo-invalido');
  });

  it('não pode mirar tabuleiro já decidido (RN-CARTAS-01)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    state = { ...state, hands: { ...state.hands, O: ['buraco-negro'] } };
    const move: Move = { player: 'O', card: 'buraco-negro', path: [0, 6] };
    expect(validateCard(state, move)).toBe('alvo-invalido');
  });
});

describe('estrela da sorte (rara, galáxia): marca a mesma posição em dois tabuleiros', () => {
  it('marca os dois tabuleiros de uma vez, na mesma jogada', () => {
    let state = createGame(classic);
    state = { ...state, hands: { ...state.hands, X: ['estrela-da-sorte'] } };
    const move: Move = { player: 'X', card: 'estrela-da-sorte', path: [1], path2: [2], cellIndex: 4 };
    expect(validateCard(state, move)).toBeNull();
    const after = applyCard(state, move);
    expect(getNode(after.board, [1, 4])).toBe('X');
    expect(getNode(after.board, [2, 4])).toBe('X');
    expect(after.hands.X).toHaveLength(0);
  });

  it('recusa se a posição já estiver ocupada em um dos dois tabuleiros', () => {
    let state = createGame(classic);
    state = applyMove(state, [1, 4]); // ocupa 1.4
    state = { ...state, currentPlayer: 'X', hands: { ...state.hands, X: ['estrela-da-sorte'] } };
    const move: Move = { player: 'X', card: 'estrela-da-sorte', path: [1], path2: [2], cellIndex: 4 };
    expect(validateCard(state, move)).toBe('alvo-invalido');
  });
});

describe('devorador de tabuleiro (épica, galáxia): bloqueia por 3 ações', () => {
  it('tabuleiro bloqueado sai da lista de permitidos e libera sozinho depois de 3 ações (RN-CARTAS-02, 04)', () => {
    let state = createGame(classic);
    state = { ...state, hands: { ...state.hands, X: ['devorador-de-tabuleiro'] } };
    state = applyCard(state, { player: 'X', card: 'devorador-de-tabuleiro', path: [4] });
    const locked = getNode(state.board, [4]) as Board;
    expect(locked.lockedUntilAction).toBe(state.actionCount + 3);
    expect(isLocked(locked, state.actionCount)).toBe(true);

    // Encaminhado pro 4 enquanto bloqueado: cai pra escolha livre (RN-CARTAS-02).
    const forcedThere = { ...state, forcedPath: [4] };
    expect(allowedBoards(forcedThere).some((p) => p.join(',') === '4')).toBe(false);
    expect(allowedBoards(forcedThere).length).toBeGreaterThan(0);

    // 3 ações depois (RN-CARTAS-04: conta ações da partida inteira), libera.
    const later = { ...state, actionCount: state.actionCount + 3 };
    expect(isLocked(getNode(later.board, [4]) as Board, later.actionCount)).toBe(false);
  });
});

describe('bolha de proteção (comum, praia): protege contra carta do adversário', () => {
  it('bloqueia carta do adversário, mas não a de quem protegeu', () => {
    let state = createGame(beach);
    state = { ...state, hands: { ...state.hands, X: ['bolha-protecao'], O: ['tsunami'] } };
    state = applyCard(state, { player: 'X', card: 'bolha-protecao', path: [4] });
    const protectedBoard = getNode(state.board, [4]) as Board;
    expect(protectedBoard.protectedBy).toBe('X');

    // O (adversário de quem protegeu) não pode mirar o 4 com tsunami.
    state = { ...state, currentPlayer: 'O' };
    expect(validateCard(state, { player: 'O', card: 'tsunami', path: [4] })).toBe('alvo-invalido');

    // X pode mirar o próprio tabuleiro protegido com a própria carta.
    state = { ...state, currentPlayer: 'X', hands: { ...state.hands, X: ['tsunami'] } };
    expect(validateCard(state, { player: 'X', card: 'tsunami', path: [4] })).toBeNull();
  });
});

describe('correnteza (rara, praia): reposiciona a própria marca', () => {
  it('move a marca própria pra outra célula vazia do mesmo tabuleiro', () => {
    let state = createGame(beach);
    state = applyMove(state, [4, 4]); // X em 4.4
    state = { ...state, currentPlayer: 'X', hands: { ...state.hands, X: ['correnteza'] } };
    const move: Move = { player: 'X', card: 'correnteza', path: [4, 4], path2: [4, 0] };
    expect(validateCard(state, move)).toBeNull();
    const after = applyCard(state, move);
    expect(getNode(after.board, [4, 4])).toBeNull();
    expect(getNode(after.board, [4, 0])).toBe('X');
  });
});

describe('tempestade (rara, praia): redireciona a próxima jogada do adversário', () => {
  it('sobrescreve o encaminhamento normal uma única vez', () => {
    let state = createGame(beach);
    state = { ...state, hands: { ...state.hands, X: ['tempestade'] } };
    state = applyCard(state, { player: 'X', card: 'tempestade', path: [7] });
    expect(state.forcedPath).toEqual([7]);
    expect(state.currentPlayer).toBe('O');
    // O joga em 7 (livre por conta da carta), manda X pro 3 normalmente depois.
    state = applyMove(state, [7, 3]);
    expect(state.forcedPath).toEqual([3]);
  });
});

describe('tsunami (épica, praia): apaga todas as marcas de um tabuleiro', () => {
  it('esvazia o tabuleiro inteiro, sem fechar a partida', () => {
    let state = createGame(beach);
    state = applyMove(state, [4, 4]);
    state = applyMove(state, [4, 0]);
    state = { ...state, currentPlayer: 'X', hands: { ...state.hands, X: ['tsunami'] } };
    const after = applyCard(state, { player: 'X', card: 'tsunami', path: [4] });
    const board4 = getNode(after.board, [4]) as Board;
    expect(board4.cells.every((c) => c === null)).toBe(true);
    expect(after.result).toBeNull();
  });
});

describe('regras transversais (RN-CARTAS-06, REQ-CARTAS-06, 10)', () => {
  it('não pode jogar carta fora da vez nem com a partida encerrada', () => {
    let state = createGame(classic);
    state = { ...state, hands: { ...state.hands, O: ['salto-estelar'] } };
    expect(
      validateCard(state, { player: 'O', card: 'salto-estelar', path: [0, 0] }),
    ).toBe('fora-de-vez');

    for (const move of X_WINS_TOP_ROW) state = applyMove(state, move);
    state = { ...state, hands: { ...state.hands, X: ['salto-estelar'] } };
    expect(
      validateCard(state, { player: 'X', card: 'salto-estelar', path: [3, 3] }),
    ).toBe('partida-encerrada');
  });

  it('carta jogada consome a vez, não marca junto de uma jogada normal', () => {
    let state = createGame(classic);
    state = { ...state, hands: { ...state.hands, X: ['salto-estelar'] } };
    const after = applyCard(state, { player: 'X', card: 'salto-estelar', path: [4, 4] });
    expect(after.moves).toHaveLength(1); // só a jogada da carta, nenhuma jogada normal junto
    expect(after.currentPlayer).toBe('O');
  });

  it('não pode jogar carta que não está na mão, nem de outro mapa', () => {
    const state = createGame(classic);
    expect(
      validateCard(state, { player: 'X', card: 'salto-estelar', path: [4, 4] }),
    ).toBe('carta-nao-esta-na-mao');
    const withBeachCard: GameState = { ...state, hands: { ...state.hands, X: ['tsunami'] } };
    expect(
      validateCard(withBeachCard, { player: 'X', card: 'tsunami', path: [4] }),
    ).toBe('carta-de-outro-mapa');
  });

  it('desfazer a jogada que concedeu uma carta ainda não usada tira a carta da mão (REQ-CARTAS-10)', () => {
    let state = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) state = applyMove(state, move);
    expect(state.hands.X).toHaveLength(1);
    state = undo(state);
    expect(state.hands.X).toHaveLength(0);
  });

  it('desfazer não reverte o efeito de uma carta já jogada em ação anterior', () => {
    let state = createGame(classic);
    state = { ...state, hands: { ...state.hands, X: ['buraco-negro'] } };
    state = applyMove(state, [4, 4]); // X marca 4.4, O vai pro 4
    state = applyMove(state, [4, 0]); // O marca 4.0, X vai pro 0
    state = applyCard(state, { player: 'X', card: 'buraco-negro', path: [4, 0] }); // apaga a marca de O
    expect(getNode(state.board, [4, 0])).toBeNull();
    // Desfaz só a última ação (a carta) — as duas jogadas normais continuam de pé.
    state = undo(state);
    expect(getNode(state.board, [4, 0])).toBe('O'); // marca de O volta, porque a carta foi desfeita
    expect(getNode(state.board, [4, 4])).toBe('X'); // jogada normal anterior intacta
  });
});

// Alvo válido pra cada carta da galáxia, evitando o tabuleiro 0 (fechado por
// X_WINS_TOP_ROW) e as células já ocupadas por aquele roteiro.
function targetFor(card: CardId): Omit<Move, 'player'> {
  switch (card) {
    case 'salto-estelar':
      return { card, path: [3, 0] };
    case 'buraco-negro':
      return { card, path: [6, 0] }; // marca de O, tabuleiro 6 ainda aberto
    case 'estrela-da-sorte':
      return { card, path: [3], path2: [4], cellIndex: 0 };
    case 'devorador-de-tabuleiro':
      return { card, path: [3] };
    default:
      throw new Error(`carta inesperada nesse teste: ${card}`);
  }
}

describe('applyAction despacha jogada normal ou carta pelo histórico (replay/undo/p2p)', () => {
  it('replay de um histórico com carta no meio chega no mesmo estado que aplicar uma a uma', () => {
    let viaApply = createGame(classic);
    for (const move of X_WINS_TOP_ROW.slice(0, 5)) viaApply = applyMove(viaApply, move);
    viaApply = applyMove(viaApply, [8, 6]); // O joga; X segue com a carta sorteada na mão
    const card = viaApply.hands.X[0];
    viaApply = applyCard(viaApply, { player: 'X', ...targetFor(card) });

    let viaAction = createGame(classic);
    for (const move of viaApply.moves) viaAction = applyAction(viaAction, move);

    expect(viaAction.board).toEqual(viaApply.board);
    expect(viaAction.hands).toEqual(viaApply.hands);
    expect(viaAction.currentPlayer).toBe(viaApply.currentPlayer);
  });
});

// createBoard importado só pra garantir que o motor de cartas não quebra a
// exportação básica do resto do engine (sanity check de import).
describe('sanidade', () => {
  it('createBoard/createGame continuam funcionando com a config estendida', () => {
    expect(createBoard(2).depth).toBe(2);
    expect(createGame(classic).hands).toEqual({ X: [], O: [] });
  });
});
