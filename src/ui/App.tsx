import { useEffect, useMemo, useState } from 'react';
import { soundsForTransition } from '../audio/events';
import { playMoveSounds, setMuted } from '../audio/sound';
import { chooseMove } from '../bot/bot';
import { applyMove, createGame, otherPlayer, replay, serialize, undo } from '../engine';
import type { GameState, Path, Player } from '../engine';
import { detectLanguage, messages } from '../i18n';
import type { Language } from '../i18n';
import {
  clearMatch,
  clearOnline,
  loadMatch,
  loadOnline,
  loadPreferences,
  saveMatch,
  savePreferences,
} from '../storage/persist';
import type { SavedOnline } from '../storage/persist';
import { addToLibrary, removeFromLibrary } from '../replay/library';
import type { LibraryEntry } from '../replay/library';
import { normalizeRoomCode } from '../p2p/protocol';
import { randomMapTheme } from '../theme/maps';
import type { MapTheme } from '../theme/maps';
import { IconInfo, IconLibrary, IconSettings, IconSoundOff, IconSoundOn } from './icons';
import { LibraryScreen } from './LibraryScreen';
import { MapBackground } from './MapBackground';
import { PlanetBackground } from './PlanetBackground';
import { OnlineGame } from './OnlineGame';
import type { OnlineInit } from './OnlineGame';
import type { MatchMode, Preferences, SavedMatch, SessionScore } from '../storage/persist';
import { downloadEntryGif, ReplayScreen } from './ReplayScreen';
import { GameScreen } from './GameScreen';
import { SetupScreen } from './SetupScreen';
import type { MatchSetup } from './SetupScreen';

interface Match {
  state: GameState;
  playerNames: [string, string];
  player1Symbol: Player;
  score: SessionScore;
  counted: boolean; // o resultado desta partida já entrou no placar?
  mode: MatchMode;
  libraryId: string | null; // entrada criada na biblioteca quando a partida terminou
  map: MapTheme; // spec MAPAS: sorteado ao criar, mantido em revanche/retomada
}

function botSymbol(mode: MatchMode): Player | null {
  return mode.type === 'bot' ? otherPlayer(mode.humanSymbol) : null;
}

const zeroScore: SessionScore = { X: 0, O: 0, draws: 0 };

export function App() {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [pendingResume, setPendingResume] = useState<SavedMatch | null>(() => loadMatch());
  const [match, setMatch] = useState<Match | null>(null);
  const [online, setOnline] = useState<OnlineInit | null>(null);
  const [pendingOnline, setPendingOnline] = useState<SavedOnline | null>(() => loadOnline());
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replayEntry, setReplayEntry] = useState<LibraryEntry | null>(null);
  const [leaveAsk, setLeaveAsk] = useState(false);
  // Mapa da sessão online em andamento: o host já sabe o dele de cara
  // (online.map); o guest só sabe depois do handshake (OnlineGame chama
  // onMapChange quando a sessão informa, RN-MAPAS-03).
  const [onlineMap, setOnlineMap] = useState<MapTheme>('galaxy');
  useEffect(() => {
    if (online) setOnlineMap(online.map ?? online.saved?.map ?? 'galaxy');
  }, [online]);

  // REQ-MENU-05: um link de convite (?join=CODIGO) pula a home e vai direto
  // pra escolha de nome. Lido uma única vez; a URL é limpa em seguida pra
  // um F5 no meio da partida não tentar entrar de novo.
  const [joinCodeFromUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('join');
    return raw ? normalizeRoomCode(raw) : null;
  });
  useEffect(() => {
    if (!joinCodeFromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState(null, '', url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const language: Language = prefs.language ?? detectLanguage();
  const msgs = messages[language];

  useEffect(() => {
    setMuted(prefs.muted);
  }, [prefs.muted]);

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [language]);

  useEffect(() => {
    if (!infoOpen && !settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfoOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen, settingsOpen]);

  const updatePrefs = (patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  };

  // REQ-STT-14: partida local persiste enquanto estiver em andamento.
  const persistMatch = (m: Match) => {
    if (m.state.result === null) {
      saveMatch({
        game: serialize(m.state),
        playerNames: m.playerNames,
        player1Symbol: m.player1Symbol,
        score: m.score,
        mode: m.mode,
        map: m.map,
      });
    } else {
      clearMatch();
    }
  };

  const setAndPersist = (m: Match) => {
    setMatch(m);
    persistMatch(m);
  };

  function startMatch(setup: MatchSetup) {
    updatePrefs({
      playerNames: setup.playerNames,
      player1Symbol: setup.player1Symbol,
      lastConfig: setup.config,
      lastMode: setup.mode,
    });
    setPendingResume(null);
    setAndPersist({
      state: createGame(setup.config),
      playerNames: setup.playerNames,
      player1Symbol: setup.player1Symbol,
      score: match?.score ?? zeroScore,
      counted: false,
      mode: setup.mode,
      libraryId: null,
      map: randomMapTheme(), // RN-MAPAS-03: quem cria a partida sorteia
    });
  }

  // REQ-SOM-01, 05, 09: toda marca que aparece no tabuleiro soa, venha de quem vier.
  function playTransition(before: GameState, after: GameState) {
    playMoveSounds(soundsForTransition(before, after));
  }

  // Nomes de exibição por símbolo, resolvidos no momento do salvamento.
  function namesBySymbol(m: Match): Record<Player, string> {
    const p1 = m.playerNames[0] || msgs.player1;
    const p2 =
      m.mode.type === 'bot'
        ? `${msgs.botName} (${
            { easy: msgs.diffEasy, medium: msgs.diffMedium, hard: msgs.diffHard }[
              m.mode.difficulty
            ]
          })`
        : m.playerNames[1] || msgs.player2;
    return m.player1Symbol === 'X' ? { X: p1, O: p2 } : { X: p2, O: p1 };
  }

  // Entrada de biblioteca (efêmera ou pra salvar) a partir da partida atual.
  function matchEntry(m: Match, state: GameState): Omit<LibraryEntry, 'id' | 'finishedAt'> {
    return {
      mode: m.mode.type,
      names: namesBySymbol(m),
      config: { ...state.config },
      moves: state.moves,
      result: state.result ?? 'draw',
      map: m.map,
    };
  }

  function applyPath(current: Match, path: Path) {
    let state: GameState;
    try {
      state = applyMove(current.state, path);
    } catch {
      return; // REQ-STT-02: jogada inválida não altera nada
    }
    playTransition(current.state, state);
    let { score, counted, libraryId } = current;
    if (state.result !== null && !counted) {
      score = { ...score };
      if (state.result === 'draw') score.draws += 1;
      else score[state.result] += 1;
      counted = true;
      // REQ-REPLAY-01: partida terminada entra na biblioteca.
      libraryId = addToLibrary(matchEntry(current, state)).id;
    }
    setAndPersist({ ...current, state, score, counted, libraryId });
  }

  function handleHumanMove(path: Path) {
    if (!match || match.state.result !== null) return;
    // No modo bot, a vez do bot não aceita clique humano.
    if (match.state.currentPlayer === botSymbol(match.mode)) return;
    applyPath(match, path);
  }

  // Vez do bot: responde com um pequeno atraso pra jogada ser perceptível (AC-STT-07).
  useEffect(() => {
    if (!match || match.mode.type !== 'bot' || match.state.result !== null) return;
    if (match.state.currentPlayer !== botSymbol(match.mode)) return;
    const mode = match.mode;
    const timer = setTimeout(() => {
      applyPath(match, chooseMove(match.state, mode.difficulty));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  function handleUndo() {
    if (!match || match.state.moves.length === 0) return;
    // REQ-STT-07: contra o bot, desfaz o par (resposta do bot + jogada humana).
    const bot = botSymbol(match.mode);
    const count =
      bot !== null && match.state.moves.at(-1)?.player === bot ? 2 : 1;
    // Desfazer após o fim reabre a partida; o placar da partida contada é revertido.
    let { score, counted, libraryId } = match;
    if (counted && match.state.result !== null) {
      score = { ...score };
      if (match.state.result === 'draw') score.draws -= 1;
      else score[match.state.result] -= 1;
      counted = false;
      // RN-REPLAY-01: o fim desfeito sai da biblioteca.
      if (libraryId !== null) {
        removeFromLibrary(libraryId);
        libraryId = null;
      }
    }
    setAndPersist({ ...match, state: undo(match.state, count), score, counted, libraryId });
  }

  // REQ-STT-08: revanche mantém adversário e regras, alternando quem começa.
  function handleRematch() {
    if (!match) return;
    const config = {
      ...match.state.config,
      startingPlayer: otherPlayer(match.state.config.startingPlayer),
    };
    setAndPersist({
      ...match,
      state: createGame(config),
      counted: false,
      libraryId: null,
    });
  }

  function handleResume() {
    if (!pendingResume) return;
    try {
      const state = replay(pendingResume.game);
      setMatch({
        state,
        playerNames: pendingResume.playerNames,
        player1Symbol: pendingResume.player1Symbol,
        score: pendingResume.score,
        counted: false,
        mode: pendingResume.mode,
        libraryId: null,
        map: pendingResume.map, // RN-MAPAS-03/REQ-MAPAS-03: retomada não sorteia de novo
      });
    } catch {
      clearMatch();
    }
    setPendingResume(null);
  }

  function handleDiscard() {
    clearMatch();
    setPendingResume(null);
  }

  const initialSetup: MatchSetup = useMemo(
    () => ({
      config:
        prefs.lastConfig ?? {
          depth: 2,
          clearVariant: false,
          tiebreak: 'majority',
          startingPlayer: prefs.player1Symbol,
        },
      playerNames: prefs.playerNames,
      player1Symbol: prefs.player1Symbol,
      mode: prefs.lastMode ?? { type: 'local' },
    }),
    [prefs],
  );

  // Rótulo do adversário no modo bot, sensível ao idioma.
  const displayNames: [string, string] | null = match
    ? match.mode.type === 'bot'
      ? [
          match.playerNames[0],
          `${msgs.botName} (${
            { easy: msgs.diffEasy, medium: msgs.diffMedium, hard: msgs.diffHard }[
              match.mode.difficulty
            ]
          })`,
        ]
      : match.playerNames
    : null;

  // Tela inicial (spec NEON, home): fundo de planetas e visual simples
  // (preto/branco), sem o brilho neon — que fica reservado pro jogo em si
  // (mesma condição que decide quando <SetupScreen> aparece, abaixo).
  const showHome =
    replayEntry === null && !libraryOpen && !online && !pendingOnline && !pendingResume && match === null;

  // Mapa da partida ativa (spec MAPAS): fora de uma partida específica
  // (biblioteca, diálogos de retomar) cai no padrão galáxia (RN-MAPAS-02).
  const currentMap: MapTheme =
    match !== null ? match.map : replayEntry !== null ? replayEntry.map : online !== null ? onlineMap : 'galaxy';

  return (
    <div className={`app${showHome ? ' home-minimal' : ''}`} data-map={showHome ? undefined : currentMap}>
      {showHome ? <PlanetBackground /> : <MapBackground map={currentMap} />}
      <header>
        <h1>{msgs.appTitle}</h1>
        <div className="header-controls">
          {!online && replayEntry === null && (
            <button
              type="button"
              className="icon-btn"
              data-testid="library-open"
              title={msgs.library}
              aria-label={msgs.library}
              onClick={() => setLibraryOpen((open) => !open)}
            >
              <IconLibrary />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            data-testid="info-open"
            title={msgs.infoLabel}
            aria-label={msgs.infoLabel}
            onClick={() => setInfoOpen(true)}
          >
            <IconInfo />
          </button>
          <button
            type="button"
            className="icon-btn"
            data-testid="settings-open"
            title={msgs.settingsLabel}
            aria-label={msgs.settingsLabel}
            onClick={() => setSettingsOpen(true)}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      {replayEntry !== null && (
        <ReplayScreen msgs={msgs} entry={replayEntry} onBack={() => setReplayEntry(null)} />
      )}

      {replayEntry === null && libraryOpen && !online && (
        <LibraryScreen
          msgs={msgs}
          language={language}
          onOpenReplay={setReplayEntry}
          onBack={() => setLibraryOpen(false)}
        />
      )}

      {replayEntry === null && !libraryOpen && online && (
        <OnlineGame
          msgs={msgs}
          init={online}
          onMapChange={setOnlineMap}
          onExit={() => {
            setOnline(null);
            setPendingOnline(null);
          }}
        />
      )}

      {replayEntry === null && !libraryOpen && !online && pendingOnline && (
        <div className="card resume" data-testid="online-resume-dialog">
          <h2>{msgs.onlineResumeTitle}</h2>
          <p>
            {msgs.roomCode}: <strong>{pendingOnline.code}</strong>. {msgs.resumeQuestion}
          </p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="online-resume"
              onClick={() => {
                setOnline({
                  role: pendingOnline.role,
                  code: pendingOnline.code,
                  myName: pendingOnline.myName,
                  saved: pendingOnline,
                });
              }}
            >
              {msgs.resume}
            </button>
            <button
              type="button"
              data-testid="online-discard"
              onClick={() => {
                clearOnline(pendingOnline.code, pendingOnline.role);
                setPendingOnline(null);
              }}
            >
              {msgs.discard}
            </button>
          </div>
        </div>
      )}

      {replayEntry === null && !libraryOpen && !online && !pendingOnline && pendingResume && (
        <div className="card resume" data-testid="resume-dialog">
          <h2>{msgs.resumeTitle}</h2>
          <p>{msgs.resumeQuestion}</p>
          <div className="controls">
            <button type="button" className="primary" onClick={handleResume} data-testid="resume">
              {msgs.resume}
            </button>
            <button type="button" onClick={handleDiscard} data-testid="discard">
              {msgs.discard}
            </button>
          </div>
        </div>
      )}

      {replayEntry === null && !libraryOpen && !online && !pendingOnline && !pendingResume && match === null && (
        <SetupScreen
          msgs={msgs}
          initial={initialSetup}
          initialJoinCode={joinCodeFromUrl}
          onStart={startMatch}
          onStartOnline={(init) => {
            updatePrefs({
              playerNames: [init.myName, prefs.playerNames[1]],
              ...(init.hostSymbol ? { player1Symbol: init.hostSymbol } : {}),
              ...(init.config ? { lastConfig: init.config } : {}),
            });
            setOnline(init);
          }}
        />
      )}

      {replayEntry === null && !libraryOpen && !online && !pendingOnline && !pendingResume && match !== null && (
        <GameScreen
          msgs={msgs}
          state={match.state}
          playerNames={displayNames ?? match.playerNames}
          player1Symbol={match.player1Symbol}
          score={match.score}
          onMove={handleHumanMove}
          onUndo={handleUndo}
          onRematch={handleRematch}
          onChangeSettings={() => {
            // REQ-CONEXAO-06: partida em andamento pede confirmação.
            if (match.state.result === null) setLeaveAsk(true);
            else {
              clearMatch();
              setMatch(null);
            }
          }}
          onOpenReplay={() =>
            setReplayEntry({
              id: match.libraryId ?? 'atual',
              finishedAt: Date.now(),
              ...matchEntry(match, match.state),
            })
          }
          onDownloadGif={() =>
            void downloadEntryGif({
              id: match.libraryId ?? 'atual',
              finishedAt: Date.now(),
              ...matchEntry(match, match.state),
            })
          }
        />
      )}

      {leaveAsk && match !== null && (
        <div className="card online-banner" data-testid="leave-dialog">
          <h2>{msgs.leaveConfirmTitle}</h2>
          <p>{msgs.leaveConfirmBody}</p>
          <div className="controls">
            <button
              type="button"
              className="primary"
              data-testid="leave-confirm"
              onClick={() => {
                // RN-CONEXAO-03: a partida não fica pendente pra retomada.
                clearMatch();
                setMatch(null);
                setLeaveAsk(false);
              }}
            >
              {msgs.leaveConfirm}
            </button>
            <button type="button" data-testid="leave-cancel" onClick={() => setLeaveAsk(false)}>
              {msgs.keepPlaying}
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className="modal-backdrop"
          data-testid="settings-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="card modal-card" role="dialog" aria-modal="true" aria-label={msgs.settingsLabel}>
            <h2>{msgs.settingsLabel}</h2>
            <div className="settings-list">
              <label className="settings-row">
                {msgs.language}
                <select
                  value={language}
                  onChange={(e) => updatePrefs({ language: e.target.value as Language })}
                  data-testid="language"
                  aria-label={msgs.language}
                >
                  <option value="pt">PT</option>
                  <option value="en">EN</option>
                </select>
              </label>
              <label className="settings-row">
                {prefs.muted ? msgs.soundOff : msgs.soundOn}
                <span className="switch sound-switch">
                  <input
                    type="checkbox"
                    data-testid="mute-toggle"
                    aria-label={prefs.muted ? msgs.soundOff : msgs.soundOn}
                    checked={prefs.muted}
                    onChange={(e) => updatePrefs({ muted: e.target.checked })}
                  />
                  <span className="switch-thumb" aria-hidden="true">
                    {prefs.muted ? <IconSoundOff /> : <IconSoundOn />}
                  </span>
                </span>
              </label>
            </div>
            <div className="controls">
              <button
                type="button"
                className="primary"
                data-testid="settings-close"
                onClick={() => setSettingsOpen(false)}
              >
                {msgs.infoClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoOpen && (
        <div
          className="modal-backdrop"
          data-testid="info-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInfoOpen(false);
          }}
        >
          <div className="card modal-card" role="dialog" aria-modal="true" aria-label={msgs.infoTitle}>
            <h2>{msgs.infoTitle}</h2>
            <p>{msgs.infoDescription}</p>
            <p>
              <a
                href="https://github.com/joaodouglasdantas/Super-TicTacToe-VARIANT-"
                target="_blank"
                rel="noreferrer"
              >
                {msgs.infoRepoLabel}
              </a>
            </p>
            <div className="controls">
              <button
                type="button"
                className="primary"
                data-testid="info-close"
                onClick={() => setInfoOpen(false)}
              >
                {msgs.infoClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
