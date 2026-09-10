import { useState } from 'react';
import type { GameConfig, Player, Tiebreak } from '../engine';
import type { Messages } from '../i18n';
import { generateRoomCode, normalizeRoomCode } from '../p2p/protocol';
import { randomMapTheme } from '../theme/maps';
import { IconCreateRoom, IconPaste, IconTwoPlayers } from './icons';
import type { OnlineInit } from './OnlineGame';

export interface MatchSetup {
  config: GameConfig;
  playerNames: [string, string];
  player1Symbol: Player;
}

interface SetupScreenProps {
  msgs: Messages;
  initial: MatchSetup;
  // REQ-MENU-05: código vindo de um link de convite pula a home e vai
  // direto pra escolha de nome, já com o código preenchido.
  initialJoinCode?: string | null;
  onStart: (setup: MatchSetup) => void;
  onStartOnline: (init: OnlineInit) => void;
}

type Stage = 'home' | 'join-name' | 'config';
type ModeType = 'local' | 'online';

// Tela inicial (REQ-MENU-01..04, RN-STT-04..06): código de convite em
// destaque, os modos abaixo, configurações atrás da engrenagem do
// cabeçalho (App.tsx).
export function SetupScreen({ msgs, initial, initialJoinCode, onStart, onStartOnline }: SetupScreenProps) {
  const [stage, setStage] = useState<Stage>(initialJoinCode ? 'join-name' : 'home');
  const [modeType, setModeType] = useState<ModeType>('local');

  const [name1, setName1] = useState(initial.playerNames[0]);
  const [name2, setName2] = useState(initial.playerNames[1]);
  const [symbol1, setSymbol1] = useState<Player>(initial.player1Symbol);
  const [starter, setStarter] = useState<1 | 2>(
    initial.config.startingPlayer === initial.player1Symbol ? 1 : 2,
  );
  const [clearVariant, setClearVariant] = useState(initial.config.clearVariant);
  const [tiebreak, setTiebreak] = useState<Tiebreak>(initial.config.tiebreak);

  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode ?? '');
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? '');
  const [codeError, setCodeError] = useState(false);

  const symbol2: Player = symbol1 === 'X' ? 'O' : 'X';

  function pickMode(mode: ModeType) {
    setModeType(mode);
    setStage('config');
  }

  function submitJoinCode() {
    const code = normalizeRoomCode(joinCodeInput);
    if (!code) {
      setCodeError(true);
      return;
    }
    setCodeError(false);
    setJoinCode(code);
    setStage('join-name');
  }

  async function pasteCode() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJoinCodeInput(text.toUpperCase());
        setCodeError(false);
      }
    } catch {
      // Sem permissão de área de transferência: usuário digita à mão.
    }
  }

  function confirmJoin() {
    onStartOnline({ role: 'guest', code: joinCode, myName: name1.trim() });
  }

  function confirmConfig() {
    if (modeType === 'online') {
      onStartOnline({
        role: 'host',
        code: generateRoomCode(),
        myName: name1.trim(),
        hostSymbol: symbol1,
        config: {
          depth: 2,
          clearVariant,
          tiebreak,
          startingPlayer: starter === 1 ? symbol1 : symbol2,
          // RN-MAPAS-03: o host sorteia; o guest sempre adota o que chega por p2p.
          map: randomMapTheme(),
        },
      });
      return;
    }
    onStart({
      config: {
        depth: 2,
        clearVariant,
        tiebreak,
        startingPlayer: starter === 1 ? symbol1 : symbol2,
        map: randomMapTheme(), // RN-MAPAS-03: quem cria a partida sorteia
      },
      playerNames: [name1.trim(), name2.trim()],
      player1Symbol: symbol1,
    });
  }

  if (stage === 'home') {
    return (
      <section className="setup">
        <div className="card join-card">
          <label htmlFor="join-code-input">{msgs.haveCode}</label>
          <div className="join-row">
            <input
              id="join-code-input"
              className="code-field"
              value={joinCodeInput}
              placeholder="ABC123"
              maxLength={6}
              onChange={(e) => {
                setJoinCodeInput(e.target.value.toUpperCase());
                setCodeError(false);
              }}
              data-testid="join-code"
            />
            <button
              type="button"
              className="icon-btn"
              title={msgs.pasteCode}
              aria-label={msgs.pasteCode}
              onClick={pasteCode}
              data-testid="join-paste"
            >
              <IconPaste />
            </button>
            <button type="button" className="primary" onClick={submitJoinCode} data-testid="join-go">
              {msgs.enterBtn}
            </button>
          </div>
          {codeError && <small data-testid="code-error">{msgs.invalidCode}</small>}
        </div>

        <div className="home-divider">{msgs.newGame}</div>

        <div className="modes-stack">
          <button
            type="button"
            className="btn primary mode-btn"
            onClick={() => pickMode('online')}
            data-testid="mode-online"
          >
            <span className="icon" aria-hidden="true">
              <IconCreateRoom />
            </span>
            <span className="label-group">
              <span className="title">{msgs.createRoom}</span>
              <span className="sub">{msgs.createRoomHint}</span>
            </span>
          </button>
          <button
            type="button"
            className="btn mode-btn"
            onClick={() => pickMode('local')}
            data-testid="mode-local"
          >
            <span className="icon" aria-hidden="true">
              <IconTwoPlayers />
            </span>
            <span className="label-group">
              <span className="title">{msgs.twoPlayers}</span>
              <span className="sub">{msgs.sameDevice}</span>
            </span>
          </button>
        </div>
      </section>
    );
  }

  if (stage === 'join-name') {
    return (
      <section className="setup card">
        <h2>{msgs.joinRoom}</h2>
        <p className="mode-tag">
          {msgs.roomCode}: <strong className="code-field">{joinCode}</strong>
        </p>
        <label>
          {msgs.yourName}
          <input
            value={name1}
            placeholder={msgs.playerNamePlaceholder}
            onChange={(e) => setName1(e.target.value)}
            data-testid="name-1"
          />
        </label>
        <div className="controls">
          <button type="button" className="primary" onClick={confirmJoin} data-testid="start">
            {msgs.enterBtn}
          </button>
          <button
            type="button"
            className="home-back"
            onClick={() => setStage('home')}
            data-testid="home-back"
          >
            {msgs.back}
          </button>
        </div>
      </section>
    );
  }

  // stage === 'config'
  return (
    <section className="setup card">
      <h2>{msgs.newGame}</h2>

      <div className="field-row">
        <label>
          {msgs.player1} ({symbol1})
          <input
            value={name1}
            placeholder={msgs.playerNamePlaceholder}
            onChange={(e) => setName1(e.target.value)}
            data-testid="name-1"
          />
        </label>
        {modeType === 'local' && (
          <label>
            {msgs.player2} ({symbol2})
            <input
              value={name2}
              placeholder={msgs.playerNamePlaceholder}
              onChange={(e) => setName2(e.target.value)}
              data-testid="name-2"
            />
          </label>
        )}
      </div>

      <div className="field-row">
        <label>
          {msgs.symbolOfPlayer1}
          <select
            value={symbol1}
            onChange={(e) => setSymbol1(e.target.value as Player)}
            data-testid="symbol-1"
          >
            <option value="X">X</option>
            <option value="O">O</option>
          </select>
        </label>
        <label>
          {msgs.whoStarts}
          <select
            value={starter}
            onChange={(e) => setStarter(Number(e.target.value) as 1 | 2)}
            data-testid="starter"
          >
            <option value={1}>{name1.trim() || msgs.player1}</option>
            <option value={2}>
              {modeType === 'local' ? name2.trim() || msgs.player2 : msgs.player2}
            </option>
          </select>
        </label>
      </div>

      <h3>{msgs.rules}</h3>
      <label className="check">
        <input
          type="checkbox"
          className="checkbox-plain"
          checked={clearVariant}
          onChange={(e) => setClearVariant(e.target.checked)}
          data-testid="clear-variant"
        />
        {msgs.clearVariant}
        <small>{msgs.clearVariantHint}</small>
      </label>
      <label>
        {msgs.tiebreak}
        <select
          value={tiebreak}
          onChange={(e) => setTiebreak(e.target.value as Tiebreak)}
          data-testid="tiebreak"
        >
          <option value="majority">{msgs.tiebreakMajority}</option>
          <option value="neutral">{msgs.tiebreakNeutral}</option>
          <option value="both">{msgs.tiebreakBoth}</option>
        </select>
      </label>

      <div className="controls">
        <button type="button" className="primary" onClick={confirmConfig} data-testid="start">
          {modeType === 'online' ? msgs.createRoom : msgs.start}
        </button>
        <button type="button" className="home-back" onClick={() => setStage('home')} data-testid="home-back">
          {msgs.back}
        </button>
      </div>
    </section>
  );
}
