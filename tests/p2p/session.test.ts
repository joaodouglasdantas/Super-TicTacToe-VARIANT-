import { describe, expect, it, vi } from 'vitest';
import type { GameConfig } from '../../src/engine';
import {
  decodeMessage,
  encodeMessage,
  generateRoomCode,
  normalizeRoomCode,
  PROTOCOL_VERSION,
} from '../../src/p2p/protocol';
import { P2PSession, type SessionEvents } from '../../src/p2p/session';
import { X_WINS_TOP_ROW } from '../engine/fixtures';
import { createFakePair, type FakePair } from './fake-transport';

const classic: GameConfig = {
  depth: 2,
  clearVariant: false,
  tiebreak: 'majority',
  startingPlayer: 'X',
  map: 'galaxy',
};

function makeEvents(): SessionEvents {
  return {
    onChange: vi.fn(),
    onUndoRequested: vi.fn(),
    onUndoDenied: vi.fn(),
    onRematchProposed: vi.fn(),
  };
}

interface Duo {
  pair: FakePair;
  host: P2PSession;
  guest: P2PSession;
  hostEvents: SessionEvents;
  guestEvents: SessionEvents;
}

function connectDuo(): Duo {
  const pair = createFakePair();
  const hostEvents = makeEvents();
  const guestEvents = makeEvents();
  const host = new P2PSession(
    pair.a,
    { role: 'host', myName: 'Ana', config: classic, hostSymbol: 'X', heartbeatMs: 0 },
    hostEvents,
  );
  const guest = new P2PSession(pair.b, { role: 'guest', myName: 'Bia', heartbeatMs: 0 }, guestEvents);
  return { pair, host, guest, hostEvents, guestEvents };
}

describe('protocolo: codificação e código de sala', () => {
  it('mensagem desconhecida ou lixo é ignorada (CL-P2P-06)', () => {
    expect(decodeMessage('não é json')).toBeNull();
    expect(decodeMessage(JSON.stringify({ t: 'hackzao', x: 1 }))).toBeNull();
    expect(decodeMessage(JSON.stringify({ sem: 'tipo' }))).toBeNull();
  });

  it('mensagem válida sobrevive ao ciclo encode/decode', () => {
    const msg = { t: 'move' as const, seq: 3, path: [4, 5] };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it('código de sala tem 6 caracteres sem ambíguos e é normalizável', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(normalizeRoomCode(` ${code.toLowerCase()} `)).toBe(code);
    }
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(normalizeRoomCode('ABCDE0')).toBeNull(); // zero é ambíguo
  });
});

describe('handshake e partida (CL-P2P-03/04/05)', () => {
  it('host e guest concluem o handshake e jogam uma partida inteira', () => {
    const { host, guest } = connectDuo();
    expect(host.snapshot().phase).toBe('playing');
    expect(guest.snapshot().phase).toBe('playing');
    expect(guest.snapshot().names).toEqual(['Ana', 'Bia']);
    expect(host.mySymbol).toBe('X');
    expect(guest.mySymbol).toBe('O');

    for (const [i, move] of X_WINS_TOP_ROW.entries()) {
      (i % 2 === 0 ? host : guest).playMove(move);
    }
    expect(host.snapshot().state.result).toBe('X');
    expect(guest.snapshot().state.result).toBe('X');
    expect(host.snapshot().score).toEqual({ X: 1, O: 0, draws: 0 });
    expect(guest.snapshot().score).toEqual({ X: 1, O: 0, draws: 0 });
  });

  it('jogada fora da vez não é emitida nem aplicada (GAR-P2P-04)', () => {
    const { host, guest } = connectDuo();
    guest.playMove([4, 4]); // vez do host (X)
    expect(host.snapshot().state.moves).toHaveLength(0);
    host.playMove([4, 4]);
    host.playMove([4, 0]); // host de novo: ignorada
    expect(guest.snapshot().state.moves).toHaveLength(1);
  });

  it('versão incompatível encerra com aviso (CL-P2P-02)', () => {
    const pair = createFakePair();
    const events = makeEvents();
    const host = new P2PSession(
      pair.a,
      { role: 'host', myName: 'Ana', config: classic, hostSymbol: 'X', heartbeatMs: 0 },
      events,
    );
    pair.a.deliverTo(
      JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION + 1, name: 'Zed' }),
    );
    expect(host.snapshot().phase).toBe('version-mismatch');
  });
});

describe('autocorreção por sync (GAR-P2P-02/03)', () => {
  it('duplicata idêntica é ignorada sem efeito', () => {
    const { pair, host, guest } = connectDuo();
    host.playMove([4, 4]);
    const raw = pair.b.peerQueue.at(-1)!; // a mensagem de move recebida pelo guest
    pair.b.deliverTo(raw); // entrega de novo
    expect(guest.snapshot().state.moves).toHaveLength(1);
    expect(host.snapshot().state.moves).toHaveLength(1);
  });

  it('lacuna de seq dispara sync e o histórico válido mais longo prevalece', () => {
    const { pair, host, guest } = connectDuo();
    host.playMove([4, 4]);
    guest.playMove([4, 0]);
    // Simula host adiantado: entrega ao guest um move com seq futuro.
    pair.b.deliverTo(JSON.stringify({ t: 'move', seq: 9, path: [0, 0] }));
    // O guest respondeu com sync do estado dele; nada corrompeu.
    expect(guest.snapshot().state.moves).toHaveLength(2);
    expect(host.snapshot().state.moves).toHaveLength(2);
  });

  it('sync inválido (replay quebra) é descartado sem afetar o estado', () => {
    const { pair, guest, host } = connectDuo();
    host.playMove([4, 4]);
    pair.b.deliverTo(
      JSON.stringify({
        t: 'sync',
        config: classic,
        hostSymbol: 'X',
        names: ['Ana', 'Bia'],
        moves: [
          { player: 'X', path: [4, 4] },
          { player: 'O', path: [9, 9] },
        ],
        score: { X: 0, O: 0, draws: 0 },
      }),
    );
    expect(guest.snapshot().state.moves).toHaveLength(1);
  });
});

describe('reconexão (GAR-P2P-05)', () => {
  it('queda no meio da partida e retomada via estado salvo', () => {
    const duo = connectDuo();
    duo.host.playMove([4, 4]);
    duo.guest.playMove([4, 0]);
    duo.host.playMove([0, 4]);

    // Queda brusca.
    duo.pair.drop();
    expect(duo.host.snapshot().phase).toBe('closed');

    // Cada lado retoma do que persistiu; o guest perdeu a última jogada.
    const hostSaved = {
      config: classic,
      hostSymbol: 'X' as const,
      moves: duo.host.snapshot().state.moves,
      score: duo.host.snapshot().score,
      names: ['Ana', 'Bia'] as [string, string],
      map: 'galaxy' as const,
    };
    const guestSaved = {
      ...hostSaved,
      moves: hostSaved.moves.slice(0, 2),
    };

    const pair2 = createFakePair();
    const host2 = new P2PSession(
      pair2.a,
      { role: 'host', myName: 'Ana', saved: hostSaved, heartbeatMs: 0 },
      makeEvents(),
    );
    const guest2 = new P2PSession(
      pair2.b,
      { role: 'guest', myName: 'Bia', saved: guestSaved, heartbeatMs: 0 },
      makeEvents(),
    );

    // Handshake + sync: o histórico mais longo (3 jogadas) prevalece nos dois.
    expect(host2.snapshot().phase).toBe('playing');
    expect(guest2.snapshot().phase).toBe('playing');
    expect(guest2.snapshot().state.moves).toHaveLength(3);
    expect(guest2.snapshot().state.currentPlayer).toBe('O');

    // E a partida continua normalmente.
    guest2.playMove([4, 1]);
    expect(host2.snapshot().state.moves).toHaveLength(4);
  });
});

describe('desfazer com consentimento (GAR-P2P-07)', () => {
  it('aceito: os dois lados voltam até antes da jogada do requerente', () => {
    const { host, guest, guestEvents } = connectDuo();
    host.playMove([4, 4]);
    guest.playMove([4, 0]);
    host.playMove([0, 4]);

    host.requestUndo(); // host quer desfazer a jogada 2 (a última dele)
    expect(guestEvents.onUndoRequested).toHaveBeenCalledWith(2);
    guest.respondUndo(2, true);

    expect(host.snapshot().state.moves).toHaveLength(2);
    expect(guest.snapshot().state.moves).toHaveLength(2);
    expect(host.snapshot().state.currentPlayer).toBe('X');
  });

  it('recusado: nada muda e o requerente é avisado', () => {
    const { host, guest, hostEvents } = connectDuo();
    host.playMove([4, 4]);
    host.requestUndo();
    guest.respondUndo(0, false);
    expect(hostEvents.onUndoDenied).toHaveBeenCalled();
    expect(host.snapshot().state.moves).toHaveLength(1);
    expect(guest.snapshot().state.moves).toHaveLength(1);
  });

  it('pedido expira quando chega jogada nova antes da resposta', () => {
    const { pair, host, guest } = connectDuo();
    host.playMove([4, 4]);
    host.requestUndo();
    guest.playMove([4, 0]); // jogada nova invalida o pedido
    // Resposta tardia aceitando: não pode mais desfazer.
    pair.a.deliverTo(JSON.stringify({ t: 'undoRes', toSeq: 0, ok: true }));
    expect(host.snapshot().state.moves).toHaveLength(2);
  });
});

describe('heartbeat (GAR-P2P-06)', () => {
  it('rede congelada sem fechar o canal é detectada como queda', () => {
    vi.useFakeTimers();
    try {
      // Par em modo manual: nada é entregue, o host fica falando sozinho.
      const pair = createFakePair({ manual: true });
      const host = new P2PSession(
        pair.a,
        {
          role: 'host',
          myName: 'Ana',
          config: classic,
          hostSymbol: 'X',
          heartbeatMs: 1000,
          staleMs: 3000,
        },
        makeEvents(),
      );
      expect(host.snapshot().phase).toBe('handshake');
      vi.advanceTimersByTime(5000);
      expect(host.snapshot().phase).toBe('closed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ping respondido com pong mantém a sessão viva', () => {
    vi.useFakeTimers();
    try {
      const pair = createFakePair();
      const host = new P2PSession(
        pair.a,
        {
          role: 'host',
          myName: 'Ana',
          config: classic,
          hostSymbol: 'X',
          heartbeatMs: 1000,
          staleMs: 3000,
        },
        makeEvents(),
      );
      // Guest sem heartbeat próprio: só responde aos pings do host.
      const guest = new P2PSession(
        pair.b,
        { role: 'guest', myName: 'Bia', heartbeatMs: 0 },
        makeEvents(),
      );
      vi.advanceTimersByTime(20_000);
      expect(host.snapshot().phase).toBe('playing');
      expect(guest.snapshot().phase).toBe('playing');
      host.leave(); // encerra o interval
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('revanche e saída', () => {
  it('revanche aceita reinicia com o iniciante alternado e placar mantido', () => {
    const { host, guest, guestEvents } = connectDuo();
    for (const [i, move] of X_WINS_TOP_ROW.entries()) {
      (i % 2 === 0 ? host : guest).playMove(move);
    }
    host.proposeRematch();
    expect(guestEvents.onRematchProposed).toHaveBeenCalled();
    guest.acceptRematch();

    expect(host.snapshot().state.moves).toHaveLength(0);
    expect(host.snapshot().state.currentPlayer).toBe('O'); // alternou
    expect(guest.snapshot().state.currentPlayer).toBe('O');
    expect(host.snapshot().score.X).toBe(1); // placar preservado
  });

  it('leave encerra a sala pros dois lados', () => {
    const { host, guest } = connectDuo();
    guest.leave();
    expect(guest.snapshot().phase).toBe('closed');
    expect(host.snapshot().phase).toBe('peer-left');
  });
});
