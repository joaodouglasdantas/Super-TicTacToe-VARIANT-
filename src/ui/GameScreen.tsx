import { allowedBoards } from '../engine';
import type { CardId, GameState, Path, Player } from '../engine';
import type { Messages } from '../i18n';
import type { SessionScore } from '../storage/persist';
import { BoardView } from './BoardView';
import { CardHand } from './CardHand';
import type { CardTarget } from './CardHand';
import { describeMove } from './moveHistory';

interface GameScreenProps {
  msgs: Messages;
  state: GameState;
  playerNames: [string, string];
  player1Symbol: Player;
  score: SessionScore;
  onMove: (path: Path) => void;
  onUndo: () => void;
  onRematch: () => void;
  onChangeSettings: () => void;
  onOpenReplay?: () => void;
  onDownloadGif?: () => void;
  // spec CARTAS: de quem é a mão mostrada nesta tela (ver CardHand.tsx).
  viewerSymbol: Player;
  onPlayCard: (card: CardId, target: CardTarget) => void;
}

export function GameScreen(props: GameScreenProps) {
  const {
    msgs,
    state,
    playerNames,
    player1Symbol,
    score,
    onMove,
    onUndo,
    onRematch,
    onChangeSettings,
    onOpenReplay,
    onDownloadGif,
    viewerSymbol,
    onPlayCard,
  } = props;

  const nameOf = (player: Player) => {
    const index = player === player1Symbol ? 0 : 1;
    const fallback = index === 0 ? msgs.player1 : msgs.player2;
    return playerNames[index] || fallback;
  };

  const allowed = new Set(allowedBoards(state).map((p) => p.join('.')));
  const lastMove = state.moves.at(-1)?.path ?? null;

  return (
    // A classe turn-X/turn-O tinge o destaque de jogável na cor de quem joga.
    <section className={`game turn-${state.currentPlayer}`}>
      <div className="status" data-testid="status">
        {state.result === null ? (
          <>
            {msgs.turnOf}{' '}
            <strong className={`mark-${state.currentPlayer}`}>
              {nameOf(state.currentPlayer)} ({state.currentPlayer})
            </strong>
          </>
        ) : state.result === 'draw' ? (
          <strong>{msgs.draw}</strong>
        ) : (
          <strong className={`mark-${state.result}`}>
            {nameOf(state.result)} ({state.result}) {msgs.winner}
          </strong>
        )}
      </div>

      <BoardView
        board={state.board}
        path={[]}
        allowed={state.result === null ? allowed : new Set()}
        lastMove={lastMove}
        tiebreak={state.config.tiebreak}
        onCellClick={onMove}
      />

      {state.result === null && (
        <CardHand msgs={msgs} state={state} viewerSymbol={viewerSymbol} onPlayCard={onPlayCard} />
      )}

      <div className="controls">
        <button
          type="button"
          onClick={onUndo}
          disabled={state.moves.length === 0}
          data-testid="undo"
        >
          {msgs.undo}
        </button>
        {/* REQ-CONEXAO-05: sair está disponível durante a partida, não só no fim. */}
        {state.result === null && (
          <button type="button" onClick={onChangeSettings} data-testid="leave-match">
            {msgs.leaveMatch}
          </button>
        )}
        {state.result !== null && (
          <>
            <button type="button" className="primary" onClick={onRematch} data-testid="rematch">
              {msgs.rematch}
            </button>
            <button type="button" onClick={onChangeSettings} data-testid="change-settings">
              {msgs.changeSettings}
            </button>
            {onOpenReplay && (
              <button type="button" onClick={onOpenReplay} data-testid="open-replay">
                {msgs.watchReplay}
              </button>
            )}
            {onDownloadGif && (
              <button type="button" onClick={onDownloadGif} data-testid="download-gif">
                {msgs.downloadGif}
              </button>
            )}
          </>
        )}
      </div>

      <div className="panels">
        <div className="card score" data-testid="score">
          <h3>{msgs.score}</h3>
          <p>
            <span className="mark-X">{nameOf('X')} (X)</span>: {score.X}
          </p>
          <p>
            <span className="mark-O">{nameOf('O')} (O)</span>: {score.O}
          </p>
          <p>
            {msgs.draws}: {score.draws}
          </p>
        </div>
        <div className="card history" data-testid="history">
          <h3>{msgs.history}</h3>
          <ol>
            {state.moves.map((move, i) => (
              <li key={i}>
                <span className={`mark-${move.player}`}>{move.player}</span>{' '}
                {describeMove(msgs, move)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
