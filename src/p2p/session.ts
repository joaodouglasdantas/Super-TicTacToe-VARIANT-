// Sessão p2p: implementa a semântica da Contract Spec P2P sobre um Transport
// qualquer. Não conhece PeerJS nem React, o que a torna testável a seco.

import {
  applyMove,
  createGame,
  otherPlayer,
  replay,
  validateMove,
} from '../engine';
import type { GameConfig, GameState, Move, Path, Player } from '../engine';
import type { SessionScore } from '../storage/persist';
import { normalizeMap } from '../theme/maps';
import type { MapTheme } from '../theme/maps';
import {
  decodeMessage,
  encodeMessage,
  PROTOCOL_VERSION,
  sanitizeName,
} from './protocol';
import type { P2PMessage } from './protocol';
import type { Role, Transport } from './transport';

export type SessionPhase =
  | 'handshake'
  | 'playing'
  | 'peer-left'
  | 'version-mismatch'
  | 'closed';

export interface SessionSnapshot {
  state: GameState;
  score: SessionScore;
  names: [string, string]; // [host, guest]
  hostSymbol: Player;
  phase: SessionPhase;
  map: MapTheme; // spec MAPAS: sorteado pelo host, sincronizado pro guest
}

export interface SessionEvents {
  onChange: (snapshot: SessionSnapshot) => void;
  onUndoRequested: (toSeq: number) => void; // o adversário pediu pra desfazer
  onUndoDenied: () => void;
  onRematchProposed: () => void;
}

export interface SessionInit {
  role: Role;
  myName: string;
  // Host de partida nova define; host/guest em retomada trazem o estado salvo.
  config?: GameConfig;
  hostSymbol?: Player;
  // Sorteado por quem cria a partida nova (RN-MAPAS-03); sem valor, vira
  // galáxia (normalizeMap). Guest de partida nova adota o que chega em 'config'.
  map?: MapTheme;
  saved?: {
    config: GameConfig;
    hostSymbol: Player;
    moves: Move[];
    score: SessionScore;
    names: [string, string];
    map: MapTheme;
  };
  // Heartbeat (GAR-P2P-06): ping a cada heartbeatMs; sem tráfego por staleMs,
  // a conexão é dada como caída. heartbeatMs 0 desliga (usado em testes).
  heartbeatMs?: number;
  staleMs?: number;
}

export class P2PSession {
  readonly role: Role;
  private transport: Transport;
  private events: SessionEvents;
  private myName: string;

  private config: GameConfig | null = null;
  private hostSymbol: Player = 'X';
  private map: MapTheme = 'galaxy';
  private names: [string, string];
  private state: GameState | null = null;
  private score: SessionScore = { X: 0, O: 0, draws: 0 };
  private counted = false;
  private phase: SessionPhase = 'handshake';
  private pendingUndo: number | null = null; // toSeq do meu pedido em aberto
  private lastSeen = Date.now();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(transport: Transport, init: SessionInit, events: SessionEvents) {
    this.role = init.role;
    this.transport = transport;
    this.events = events;
    this.myName = sanitizeName(init.myName);
    this.names = init.role === 'host' ? [this.myName, ''] : ['', this.myName];

    if (init.saved) {
      this.config = init.saved.config;
      this.hostSymbol = init.saved.hostSymbol;
      this.map = normalizeMap(init.saved.map);
      this.names = init.saved.names;
      this.score = init.saved.score;
      this.state = replay({ config: init.saved.config, moves: init.saved.moves });
    } else if (init.role === 'host') {
      if (!init.config || !init.hostSymbol) {
        throw new Error('host de partida nova precisa de config e hostSymbol');
      }
      this.config = init.config;
      this.hostSymbol = init.hostSymbol;
      this.map = normalizeMap(init.map); // RN-MAPAS-03: só quem cria sorteia
      this.state = createGame(init.config);
    }

    transport.onMessage((raw) => this.receive(raw));
    transport.onClose(() => {
      this.stopHeartbeat();
      // Fases terminais informativas (saída deliberada, versão) não são
      // rebaixadas pro genérico 'closed' quando o canal cai em seguida.
      if (this.phase !== 'peer-left' && this.phase !== 'version-mismatch') {
        this.setPhase('closed');
      }
    });
    this.send({ t: 'hello', v: PROTOCOL_VERSION, name: this.myName });

    // GAR-P2P-06: rede que congela sem fechar o canal também é detectada.
    const heartbeatMs = init.heartbeatMs ?? 5000;
    const staleMs = init.staleMs ?? 12_000;
    if (heartbeatMs > 0) {
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastSeen > staleMs) {
          this.stopHeartbeat();
          this.transport.close();
          if (this.phase !== 'peer-left' && this.phase !== 'version-mismatch') {
            this.setPhase('closed');
          }
          return;
        }
        this.send({ t: 'ping' });
      }, heartbeatMs);
    }
  }

  // -- API pra UI ------------------------------------------------------------

  get mySymbol(): Player {
    return this.role === 'host' ? this.hostSymbol : otherPlayer(this.hostSymbol);
  }

  snapshot(): SessionSnapshot {
    if (!this.state) throw new Error('sessão sem estado (handshake incompleto)');
    return {
      state: this.state,
      score: this.score,
      names: this.names,
      hostSymbol: this.hostSymbol,
      phase: this.phase,
      map: this.map,
    };
  }

  // Jogada local. Só emite quando o motor confirma a vez (GAR-P2P-04).
  playMove(path: Path): void {
    if (!this.state || this.phase !== 'playing') return;
    if (this.state.currentPlayer !== this.mySymbol) return;
    if (validateMove(this.state, path) !== null) return;
    const seq = this.state.moves.length;
    this.applyValidated(path);
    this.pendingUndo = null;
    this.send({ t: 'move', seq, path });
  }

  // GAR-P2P-07: desfazer só com consentimento. toSeq = histórico após desfazer
  // até antes da minha última jogada.
  requestUndo(): void {
    if (!this.state || this.phase !== 'playing') return;
    const moves = this.state.moves;
    const lastMine = moves.map((m) => m.player).lastIndexOf(this.mySymbol);
    if (lastMine < 0) return;
    this.pendingUndo = lastMine;
    this.send({ t: 'undoReq', toSeq: lastMine });
  }

  respondUndo(toSeq: number, ok: boolean): void {
    this.send({ t: 'undoRes', toSeq, ok });
    if (ok) this.undoTo(toSeq);
  }

  proposeRematch(): void {
    if (this.state?.result === null) return;
    this.send({ t: 'rematch' });
  }

  acceptRematch(): void {
    this.send({ t: 'rematchOk' });
    this.startRematch();
  }

  leave(): void {
    this.stopHeartbeat();
    this.send({ t: 'leave' });
    this.transport.close();
    this.setPhase('closed');
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  // -- Recebimento -----------------------------------------------------------

  private receive(raw: string): void {
    this.lastSeen = Date.now();
    const msg = decodeMessage(raw);
    if (msg === null) return; // CL-P2P-06
    switch (msg.t) {
      case 'ping':
        return this.send({ t: 'pong' });
      case 'pong':
        return; // lastSeen já foi atualizado
      case 'hello':
        return this.onHello(msg);
      case 'config':
        return this.onConfig(msg);
      case 'accept':
        return this.onAccept();
      case 'move':
        return this.onMove(msg);
      case 'sync':
        return this.onSync(msg);
      case 'undoReq':
        return this.events.onUndoRequested(msg.toSeq);
      case 'undoRes':
        return this.onUndoRes(msg);
      case 'rematch':
        return this.events.onRematchProposed();
      case 'rematchOk':
        return this.startRematch();
      case 'leave':
        this.setPhase('peer-left');
        return;
    }
  }

  private onHello(msg: Extract<P2PMessage, { t: 'hello' }>): void {
    if (msg.v !== PROTOCOL_VERSION) {
      // CL-P2P-02: versão diferente encerra com aviso.
      this.setPhase('version-mismatch');
      this.transport.close();
      return;
    }
    const name = sanitizeName(msg.name);
    if (this.role === 'host') {
      if (name) this.names = [this.names[0], name];
      // Partida nova ou retomada: config sempre segue o mesmo caminho (CL-P2P-05).
      this.send({
        t: 'config',
        config: this.config!,
        hostSymbol: this.hostSymbol,
        names: this.names,
        map: this.map,
      });
    } else if (name) {
      this.names = [name, this.names[1]];
    }
    this.emit();
  }

  private onConfig(msg: Extract<P2PMessage, { t: 'config' }>): void {
    if (this.role !== 'guest') return;
    if (this.state === null) {
      // Partida nova: adota a configuração do host (RN-MAPAS-03, guest nunca sorteia).
      this.config = msg.config;
      this.hostSymbol = msg.hostSymbol;
      this.map = normalizeMap(msg.map);
      this.state = createGame(msg.config);
    }
    // Retomada: mantém o estado local (config é imutável); só atualiza nomes.
    this.names = [sanitizeName(msg.names[0]) || this.names[0], this.names[1]];
    this.send({ t: 'accept' });
    this.becomePlaying();
  }

  private onAccept(): void {
    if (this.role !== 'host') return;
    this.becomePlaying();
  }

  private becomePlaying(): void {
    this.setPhase('playing');
    // GAR-P2P-05: retomada troca sync quando há histórico.
    if (this.state && this.state.moves.length > 0) this.sendSync();
  }

  private onMove(msg: Extract<P2PMessage, { t: 'move' }>): void {
    if (!this.state || this.phase !== 'playing') return;
    const moves = this.state.moves;
    // GAR-P2P-02: duplicata idêntica é ignorada.
    if (msg.seq < moves.length) {
      const known = moves[msg.seq];
      if (known && JSON.stringify(known.path) === JSON.stringify(msg.path)) return;
      return this.sendSync(); // duplicata divergente: autocorreção
    }
    if (msg.seq > moves.length) return this.sendSync(); // lacuna: autocorreção
    // Vez e validade conferidas pelo motor local (CL-P2P-03/04, GAR-P2P-04).
    if (
      this.state.currentPlayer === this.mySymbol ||
      validateMove(this.state, msg.path) !== null
    ) {
      return this.sendSync();
    }
    this.applyValidated(msg.path);
    this.pendingUndo = null;
  }

  private onSync(msg: Extract<P2PMessage, { t: 'sync' }>): void {
    // GAR-P2P-03: prevalece o histórico válido mais longo.
    let theirState: GameState;
    try {
      theirState = replay({ config: msg.config, moves: msg.moves });
    } catch {
      return; // sync inválido é descartado; o meu estado segue de pé
    }
    const mine = this.state?.moves.length ?? -1;
    if (theirState.moves.length > mine) {
      this.config = msg.config;
      this.hostSymbol = msg.hostSymbol;
      this.map = normalizeMap(msg.map);
      this.names = [sanitizeName(msg.names[0]), sanitizeName(msg.names[1])];
      this.state = theirState;
      this.score = msg.score;
      this.counted = theirState.result !== null;
      this.emit();
    } else if (this.state && this.state.moves.length > theirState.moves.length) {
      this.sendSync();
    }
  }

  private onUndoRes(msg: Extract<P2PMessage, { t: 'undoRes' }>): void {
    if (this.pendingUndo === null || msg.toSeq !== this.pendingUndo) return;
    this.pendingUndo = null;
    if (msg.ok) this.undoTo(msg.toSeq);
    else this.events.onUndoDenied();
  }

  // -- Internos --------------------------------------------------------------

  private applyValidated(path: Path): void {
    this.state = applyMove(this.state!, path);
    if (this.state.result !== null && !this.counted) {
      this.counted = true;
      if (this.state.result === 'draw') this.score = { ...this.score, draws: this.score.draws + 1 };
      else this.score = { ...this.score, [this.state.result]: this.score[this.state.result] + 1 };
    }
    this.emit();
  }

  private undoTo(toSeq: number): void {
    if (!this.state) return;
    if (this.counted && this.state.result !== null) {
      // Reabrir a partida devolve o ponto contado.
      if (this.state.result === 'draw') this.score = { ...this.score, draws: this.score.draws - 1 };
      else this.score = { ...this.score, [this.state.result]: this.score[this.state.result] - 1 };
      this.counted = false;
    }
    this.state = replay({
      config: this.state.config,
      moves: this.state.moves.slice(0, toSeq),
    });
    this.emit();
  }

  private startRematch(): void {
    if (!this.state || !this.config) return;
    this.config = {
      ...this.config,
      startingPlayer: otherPlayer(this.config.startingPlayer),
    };
    this.state = createGame(this.config);
    this.counted = false;
    this.pendingUndo = null;
    this.emit();
  }

  private sendSync(): void {
    if (!this.state || !this.config) return;
    this.send({
      t: 'sync',
      config: this.config,
      hostSymbol: this.hostSymbol,
      names: this.names,
      moves: this.state.moves,
      score: this.score,
      map: this.map,
    });
  }

  private send(msg: P2PMessage): void {
    try {
      this.transport.send(encodeMessage(msg));
    } catch {
      // transporte fechado no meio do envio: a queda chega pelo onClose
    }
  }

  private setPhase(phase: SessionPhase): void {
    this.phase = phase;
    this.emit();
  }

  private emit(): void {
    if (this.state) this.events.onChange(this.snapshot());
  }
}
