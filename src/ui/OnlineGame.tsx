import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardId, GameConfig, Path, Player } from '../engine';
import type { Messages } from '../i18n';
import { soundsForTransition } from '../audio/events';
import { playMoveSounds } from '../audio/sound';
import { generateRoomCode } from '../p2p/protocol';
import { P2PSession } from '../p2p/session';
import type { SessionSnapshot } from '../p2p/session';
import { connectTransport } from '../p2p/transport';
import type { Role, TransportAttempt, TransportError } from '../p2p/transport';
import type { CardTarget } from './CardHand';
import { Ellipsis } from './Ellipsis';
import { addToLibrary, removeFromLibrary } from '../replay/library';
import type { LibraryEntry } from '../replay/library';
import { clearOnline, saveOnline } from '../storage/persist';
import type { SavedOnline } from '../storage/persist';
import type { MapTheme } from '../theme/maps';
import { GameScreen } from './GameScreen';
import { downloadEntryGif, ReplayScreen } from './ReplayScreen';

export interface OnlineInit {
  role: Role;
  code: string;
  myName: string;
  // Partida nova de host: o mapa (spec MAPAS) já vem dentro de config.map,
  // sorteado por quem cria a sala (RN-MAPAS-03) — guest nunca sorteia.
  config?: GameConfig;
  hostSymbol?: Player;
  // Retomada (qualquer papel):
  saved?: SavedOnline;
}

interface OnlineGameProps {
  msgs: Messages;
  init: OnlineInit;
  onExit: () => void;
  // O mapa só é conhecido de verdade depois do handshake (guest adota o do
  // host); App.tsx usa isso pra escolher o fundo decorativo certo (spec MAPAS).
  onMapChange: (map: MapTheme) => void;
}

type Stage = 'connecting' | 'waiting' | 'playing';

// REQ-CONEXAO-02 e 03: limites de tempo da conexão e da reconexão automática.
const CONNECT_TIMEOUT_MS = 20_000;
const RECONNECT_DELAYS_MS = [4000, 8000, 16_000, 32_000, 60_000];

// Erro local de tempo esgotado, somado aos erros do transporte.
type OnlineError = TransportError | { kind: 'tempo-esgotado' };

export function OnlineGame({ msgs, init, onExit, onMapChange }: OnlineGameProps) {
  const [code, setCode] = useState(init.code);
  const [stage, setStage] = useState<Stage>('connecting');
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<OnlineError | null>(null);
  const [undoAsk, setUndoAsk] = useState<number | null>(null);
  const [undoDenied, setUndoDenied] = useState(false);
  const [undoSent, setUndoSent] = useState(false);
  const [rematchAsk, setRematchAsk] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);

  const sessionRef = useRef<P2PSession | null>(null);
  const savedRef = useRef<SavedOnline | null>(init.saved ?? null);
  const retriesRef = useRef(0);
  const attemptRef = useRef<TransportAttempt | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTriesRef = useRef(0);
  const [replayOpen, setReplayOpen] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // REQ-MENU-06: link de convite com o código embutido; quem abrir cai
  // direto na tela de escolher o nome (App.tsx lê ?join= e pula a home).
  function inviteUrl(roomCode: string): string {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('join', roomCode);
    return url.toString();
  }

  async function copyCode(roomCode: string) {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o código já está visível na tela.
    }
  }

  async function shareCode(roomCode: string) {
    const url = inviteUrl(roomCode);
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // Cancelado pelo usuário: nada a fazer.
      }
    } else {
      await copyCode(url);
    }
  }
  const libraryIdRef = useRef<string | null>(null);
  const prevResultRef = useRef<SessionSnapshot['state']['result']>(null);
  // RN-CONEXAO-08: um pedido de desfazer só pode ser aceito enquanto nenhuma
  // jogada nova aconteceu depois dele, senão o aceite faria um rollback maior
  // do que o esperado. movesLenRef acompanha o total de jogadas a cada
  // mudança de estado; undoAskMovesRef guarda quantas havia quando o pedido
  // chegou, pra o aviso sumir sozinho se esse número mudar antes de alguém
  // decidir.
  const movesLenRef = useRef(0);
  const undoAskMovesRef = useRef<number | null>(null);

  function snapshotEntry(snap: SessionSnapshot): LibraryEntry {
    const other: 'X' | 'O' = snap.hostSymbol === 'X' ? 'O' : 'X';
    return {
      id: libraryIdRef.current ?? 'atual',
      finishedAt: Date.now(),
      mode: 'online',
      names: {
        [snap.hostSymbol]: snap.names[0] || 'Host',
        [other]: snap.names[1] || 'Guest',
      } as LibraryEntry['names'],
      config: { ...snap.state.config },
      moves: snap.state.moves,
      result: snap.state.result ?? 'draw',
    };
  }

  const connect = useCallback(
    (roomCode: string) => {
      // RN-CONEXAO-04: nunca duas tentativas ao mesmo tempo; a anterior é
      // cancelada e o peer dela destruído antes de abrir outra.
      attemptRef.current?.cancel();
      attemptRef.current = null;
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);

      setError(null);
      setStage(init.role === 'host' ? 'waiting' : 'connecting');

      // REQ-CONEXAO-02: o guest não fica em "Conectando..." pra sempre quando
      // o canal WebRTC não abre; o host segue aguardando por tempo indefinido,
      // porque esperar alguém entrar na sala é o comportamento esperado.
      if (init.role === 'guest') {
        timeoutRef.current = setTimeout(() => {
          if (sessionRef.current === null) {
            attemptRef.current?.cancel();
            attemptRef.current = null;
            setError({ kind: 'tempo-esgotado' });
          }
        }, CONNECT_TIMEOUT_MS);
      }

      attemptRef.current = connectTransport(init.role, roomCode, {
        onOpen: (transport) => {
          if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          retriesRef.current = 0;
          reconnectTriesRef.current = 0;
          const saved = savedRef.current;
          sessionRef.current = new P2PSession(
            transport,
            saved
              ? { role: init.role, myName: init.myName, saved }
              : {
                  role: init.role,
                  myName: init.myName,
                  config: init.config,
                  hostSymbol: init.hostSymbol,
                },
            {
              onChange: (snap) => {
                // REQ-SOM-05: a jogada que chega do adversário também soa.
                setSnapshot((prev) => {
                  if (prev !== null) {
                    playMoveSounds(soundsForTransition(prev.state, snap.state));
                  }
                  return snap;
                });
                if (snap.phase === 'playing') setStage('playing');
                onMapChange(snap.state.config.map);
                // Toda mudança de estado real limpa avisos transitórios.
                setUndoSent(false);
                // RN-CONEXAO-08: jogada nova depois do pedido invalida o
                // pedido de desfazer em aberto (o pedido ficaria desatualizado
                // e aceitá-lo desfaria jogadas que já não fazem parte dele).
                if (undoAskMovesRef.current !== null && snap.state.moves.length !== undoAskMovesRef.current) {
                  undoAskMovesRef.current = null;
                  setUndoAsk(null);
                }
                movesLenRef.current = snap.state.moves.length;
                if (snap.state.moves.length === 0 && snap.state.result === null) {
                  setRematchAsk(false);
                  setRematchSent(false);
                }
                // REQ-REPLAY-01 / RN-REPLAY-01 no online: entra na biblioteca ao
                // terminar; sai se o fim for desfeito (undo aceito após o fim).
                const result = snap.state.result;
                if (prevResultRef.current === null && result !== null) {
                  libraryIdRef.current = addToLibrary({
                    mode: 'online',
                    names: snapshotEntry(snap).names,
                    config: { ...snap.state.config },
                    moves: snap.state.moves,
                    result,
                  }).id;
                } else if (prevResultRef.current !== null && result === null) {
                  if (libraryIdRef.current !== null) {
                    removeFromLibrary(libraryIdRef.current);
                    libraryIdRef.current = null;
                  }
                }
                prevResultRef.current = result;
                savedRef.current = {
                  code: roomCode,
                  role: init.role,
                  myName: init.myName,
                  config: snap.state.config,
                  hostSymbol: snap.hostSymbol,
                  moves: snap.state.moves,
                  score: snap.score,
                  names: snap.names,
                };
                if (snap.phase === 'peer-left' || snap.phase === 'version-mismatch') {
                  clearOnline(roomCode, init.role);
                } else {
                  saveOnline(savedRef.current);
                }
              },
              onUndoRequested: (toSeq) => {
                undoAskMovesRef.current = movesLenRef.current;
                setUndoAsk(toSeq);
              },
              onUndoDenied: () => {
                setUndoSent(false);
                setUndoDenied(true);
              },
              onRematchProposed: () => setRematchAsk(true),
            },
          );
        },
        onError: (err) => {
          if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Código em uso ao criar: gera outro e tenta de novo (até 3 vezes).
          if (err.kind === 'codigo-em-uso' && init.role === 'host' && retriesRef.current < 3) {
            retriesRef.current += 1;
            const fresh = generateRoomCode();
            setCode(fresh);
            connect(fresh);
            return;
          }
          setError(err);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [init.role, init.myName],
  );

  useEffect(() => {
    connect(code);
    // Desmontar a tela destrói o peer: sem isso a sala continuaria registrada
    // no broker aceitando conexões fantasma (REQ-CONEXAO-01).
    return () => {
      attemptRef.current?.cancel();
      attemptRef.current = null;
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = sessionRef.current;
  const disconnected =
    snapshot !== null && snapshot.phase === 'closed' && snapshot.state.result === null;

  // REQ-CONEXAO-03: queda no meio da partida tenta reconectar sozinho com
  // intervalo crescente e limite de tentativas; depois disso, só no manual.
  useEffect(() => {
    if (!disconnected) {
      reconnectTriesRef.current = 0;
      return;
    }
    const tries = reconnectTriesRef.current;
    if (tries >= RECONNECT_DELAYS_MS.length) return;
    const timer = setTimeout(() => {
      reconnectTriesRef.current = tries + 1;
      connect(code);
    }, RECONNECT_DELAYS_MS[tries]);
    return () => clearTimeout(timer);
  }, [disconnected, code, connect, snapshot]);

  function endMatch() {
    // RN-CONEXAO-02: avisa o adversário antes de destruir a conexão.
    session?.leave();
    attemptRef.current?.cancel();
    attemptRef.current = null;
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    clearOnline(code, init.role);
    onExit();
  }

  function manualReconnect() {
    reconnectTriesRef.current = 0;
    connect(code);
  }

  // --- Telas fora de jogo ---------------------------------------------------

  if (error) {
    const message =
      error.kind === 'sala-nao-encontrada'
        ? msgs.errRoomNotFound
        : error.kind === 'tempo-esgotado'
          ? msgs.errTimeout
          : msgs.errBroker;
    return (
      <section className="card online-status" data-testid="online-error">
        <p>{message}</p>
        <div className="controls">
          <button type="button" className="primary" onClick={() => connect(code)}>
            {msgs.retry}
          </button>
          <button type="button" onClick={endMatch}>
            {msgs.back}
          </button>
        </div>
      </section>
    );
  }

  if (snapshot === null) {
    return (
      <section className="card online-status" data-testid="online-waiting">
        {init.role === 'host' && (
          <>
            <h2>{msgs.roomCode}</h2>
            <p className="room-code" data-testid="room-code">
              {code}
            </p>
            <div className="host-code-actions">
              <button type="button" onClick={() => void copyCode(code)} data-testid="copy-code">
                {codeCopied ? msgs.codeCopied : msgs.copyCode}
              </button>
              <button type="button" onClick={() => void shareCode(code)} data-testid="share-code">
                {msgs.shareCode}
              </button>
            </div>
            <p className="mode-tag">{msgs.roomCodeHint}</p>
          </>
        )}
        <p>
          {stage === 'waiting' ? msgs.waitingGuest : msgs.connecting}
          <Ellipsis />
        </p>
        <button type="button" onClick={endMatch}>
          {msgs.back}
        </button>
      </section>
    );
  }

  if (snapshot.phase === 'peer-left' || snapshot.phase === 'version-mismatch') {
    return (
      <section className="card online-status" data-testid="online-ended">
        <p>{snapshot.phase === 'peer-left' ? msgs.peerLeft : msgs.versionMismatch}</p>
        <button type="button" className="primary" onClick={endMatch}>
          {msgs.back}
        </button>
      </section>
    );
  }

  // --- Partida --------------------------------------------------------------

  const mySymbol = init.role === 'host' ? snapshot.hostSymbol : snapshot.hostSymbol === 'X' ? 'O' : 'X';
  const displayNames: [string, string] = [
    snapshot.names[0] + (init.role === 'host' ? ` (${msgs.you})` : ''),
    snapshot.names[1] + (init.role === 'guest' ? ` (${msgs.you})` : ''),
  ];

  function handleMove(path: Path) {
    setUndoDenied(false);
    session?.playMove(path);
  }

  function handlePlayCard(card: CardId, target: CardTarget) {
    setUndoDenied(false);
    session?.playCard(card, target);
  }

  if (replayOpen) {
    return (
      <ReplayScreen
        msgs={msgs}
        entry={snapshotEntry(snapshot)}
        onBack={() => setReplayOpen(false)}
      />
    );
  }

  return (
    <>
      {disconnected && (
        <div className="card online-banner" data-testid="online-reconnect">
          <p>
            {msgs.waitingReconnect}
            <Ellipsis />
          </p>
          <div className="controls">
            <button type="button" className="primary" onClick={manualReconnect}>
              {msgs.reconnect}
            </button>
            <button type="button" onClick={endMatch} data-testid="end-match">
              {msgs.endMatch}
            </button>
          </div>
        </div>
      )}

      <GameScreen
        msgs={msgs}
        state={snapshot.state}
        playerNames={displayNames}
        player1Symbol={snapshot.hostSymbol}
        score={snapshot.score}
        onMove={handleMove}
        viewerSymbol={mySymbol}
        onPlayCard={handlePlayCard}
        onUndo={() => {
          if (snapshot.state.moves.some((m) => m.player === mySymbol)) {
            setUndoSent(true);
            session?.requestUndo();
          }
        }}
        onRematch={() => {
          setRematchSent(true);
          session?.proposeRematch();
        }}
        onChangeSettings={endMatch}
        onOpenReplay={() => setReplayOpen(true)}
        onDownloadGif={() => void downloadEntryGif(snapshotEntry(snapshot))}
      />

      <div className="online-footer controls">
        <span className="mode-tag">
          {msgs.roomCode}: <strong data-testid="room-code">{code}</strong>
        </span>
        <button
          type="button"
          data-testid="end-match"
          onClick={() => {
            // REQ-CONEXAO-06: partida em andamento pede confirmação.
            if (snapshot.state.result === null) setLeaveAsk(true);
            else endMatch();
          }}
        >
          {msgs.leaveMatch}
        </button>
      </div>

      {leaveAsk && (
        <div className="card online-banner" data-testid="leave-dialog">
          <h2>{msgs.leaveConfirmTitle}</h2>
          <p>{msgs.leaveConfirmBody}</p>
          <div className="controls">
            <button type="button" className="primary" data-testid="leave-confirm" onClick={endMatch}>
              {msgs.leaveConfirm}
            </button>
            <button type="button" data-testid="leave-cancel" onClick={() => setLeaveAsk(false)}>
              {msgs.keepPlaying}
            </button>
          </div>
        </div>
      )}

      {undoSent && (
        <p className="toast" data-testid="undo-sent">
          {msgs.undoSent}
          <Ellipsis />
        </p>
      )}
      {undoDenied && <p className="toast" data-testid="undo-denied">{msgs.undoDeniedMsg}</p>}
      {rematchSent && snapshot.state.result !== null && (
        <p className="toast">
          {msgs.rematchSent}
          <Ellipsis />
        </p>
      )}

      {undoAsk !== null && (
        // Fixo no topo, não um banner solto rolado lá embaixo: precisa ser
        // impossível de perder de vista. Não bloqueia o tabuleiro por trás
        // de propósito (sem backdrop cobrindo a tela) porque o adversário
        // pode continuar jogando enquanto decide, e se jogar o pedido some
        // sozinho (RN-CONEXAO-08), não trava a partida esperando resposta.
        <div className="card undo-alert" role="alert" data-testid="undo-dialog">
          <p>{msgs.undoAsk}</p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="undo-accept"
              onClick={() => {
                session?.respondUndo(undoAsk, true);
                undoAskMovesRef.current = null;
                setUndoAsk(null);
              }}
            >
              {msgs.acceptBtn}
            </button>
            <button
              type="button"
              data-testid="undo-reject"
              onClick={() => {
                session?.respondUndo(undoAsk, false);
                undoAskMovesRef.current = null;
                setUndoAsk(null);
              }}
            >
              {msgs.rejectBtn}
            </button>
          </div>
        </div>
      )}

      {rematchAsk && (
        <div className="card online-banner" data-testid="rematch-dialog">
          <p>{msgs.rematchAsk}</p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="rematch-accept"
              onClick={() => {
                session?.acceptRematch();
                setRematchAsk(false);
                setRematchSent(false);
              }}
            >
              {msgs.acceptBtn}
            </button>
            <button type="button" onClick={() => setRematchAsk(false)}>
              {msgs.rejectBtn}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
