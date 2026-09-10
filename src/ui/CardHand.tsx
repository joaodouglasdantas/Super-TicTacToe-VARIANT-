// Mão de cartas (spec CARTAS): mostra a mão de quem está vendo a tela
// (nomeada) e só a contagem da mão do adversário (REQ-CARTAS-07). A UI é
// deliberadamente simples — ícone, nome, raridade e seletores por alvo —
// refinamento visual fica pra depois (Fora do Escopo da spec).

import { useEffect, useState } from 'react';
import { cardRarity, otherPlayer } from '../engine';
import type { CardId, GameState, Path, Player } from '../engine';
import type { Messages } from '../i18n';
import { CARD_ICON, cardDescription, cardName, cardRarityLabel } from './cardMeta';
import {
  boardsForPosition,
  correntezaDestinations,
  correntezaOrigins,
  shapeOf,
  starPositions,
  validBoards,
  validCells,
} from './cardTargets';
import { IconCardBack } from './icons';

export interface CardTarget {
  path: Path;
  path2?: Path;
  cellIndex?: number;
}

interface CardHandProps {
  msgs: Messages;
  state: GameState;
  // De quem é a mão mostrada com nome/ícone (local: quem está na vez;
  // online: o próprio jogador, fixo pra cada lado da conexão).
  viewerSymbol: Player;
  onPlayCard: (card: CardId, target: CardTarget) => void;
}

const key = (p: Path) => p.join('.');
const fromKey = (k: string): Path => k.split('.').map(Number);

function fmtBoard(msgs: Messages, p: Path): string {
  return `${msgs.boardLabel} ${p[0] + 1}`;
}

function fmtCell(msgs: Messages, p: Path): string {
  return `${msgs.boardLabel} ${p[0] + 1}, ${msgs.cellLabel} ${p[p.length - 1] + 1}`;
}

export function CardHand({ msgs, state, viewerSymbol, onPlayCard }: CardHandProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const [board, setBoard] = useState('');
  const [cell, setCell] = useState('');
  const [position, setPosition] = useState('');
  const [boardA, setBoardA] = useState('');
  const [boardB, setBoardB] = useState('');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');

  const hand = state.hands[viewerSymbol];
  const opponentCount = state.hands[otherPlayer(viewerSymbol)].length;
  const canAct = state.result === null && state.currentPlayer === viewerSymbol;

  // Toda jogada nova (própria ou do adversário) invalida a seleção em
  // andamento: os alvos válidos de antes podem não existir mais.
  useEffect(() => {
    setSelected(null);
  }, [state.moves.length]);

  function selectCard(card: CardId) {
    if (!canAct) return;
    setSelected(card);
    setBoard('');
    setCell('');
    setPosition('');
    setBoardA('');
    setBoardB('');
    setOrigin('');
    setDest('');
  }

  function confirm(target: CardTarget) {
    if (!selected) return;
    onPlayCard(selected, target);
    setSelected(null);
  }

  return (
    <div className="card hand-panel" data-testid="card-hand">
      <div className="hand-header">
        <h3>{msgs.hand}</h3>
        <span className="opponent-hand" data-testid="opponent-hand-count">
          <IconCardBack />
          {opponentCount}
        </span>
      </div>

      {hand.length === 0 ? (
        <p className="hand-empty">{msgs.handEmpty}</p>
      ) : (
        <div className="hand-row">
          {hand.map((card, i) => {
            const Icon = CARD_ICON[card];
            return (
              <button
                key={`${card}-${i}`}
                type="button"
                className={`hand-card rarity-${cardRarity(card)}`}
                data-testid={`hand-card-${card}`}
                disabled={!canAct}
                title={`${cardName(msgs, card)} (${cardRarityLabel(msgs, card)}) — ${cardDescription(msgs, card)}`}
                onClick={() => selectCard(card)}
              >
                <Icon />
                <span className="hand-card-name">{cardName(msgs, card)}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <CardTargetPanel
          msgs={msgs}
          state={state}
          player={viewerSymbol}
          card={selected}
          onConfirm={confirm}
          onCancel={() => setSelected(null)}
          board={board}
          setBoard={setBoard}
          cell={cell}
          setCell={setCell}
          position={position}
          setPosition={setPosition}
          boardA={boardA}
          setBoardA={setBoardA}
          boardB={boardB}
          setBoardB={setBoardB}
          origin={origin}
          setOrigin={setOrigin}
          dest={dest}
          setDest={setDest}
        />
      )}
    </div>
  );
}

interface TargetPanelProps {
  msgs: Messages;
  state: GameState;
  player: Player;
  card: CardId;
  onConfirm: (target: CardTarget) => void;
  onCancel: () => void;
  board: string;
  setBoard: (v: string) => void;
  cell: string;
  setCell: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  boardA: string;
  setBoardA: (v: string) => void;
  boardB: string;
  setBoardB: (v: string) => void;
  origin: string;
  setOrigin: (v: string) => void;
  dest: string;
  setDest: (v: string) => void;
}

function CardTargetPanel(props: TargetPanelProps) {
  const {
    msgs,
    state,
    player,
    card,
    onConfirm,
    onCancel,
    board,
    setBoard,
    cell,
    setCell,
    position,
    setPosition,
    boardA,
    setBoardA,
    boardB,
    setBoardB,
    origin,
    setOrigin,
    dest,
    setDest,
  } = props;
  const shape = shapeOf(card);

  let body: JSX.Element;
  let ready = false;
  let doConfirm = () => {};

  if (shape === 'board') {
    const options = validBoards(state, player, card);
    ready = board !== '';
    doConfirm = () => onConfirm({ path: fromKey(board) });
    body = (
      <label>
        {msgs.chooseBoard}
        <select value={board} onChange={(e) => setBoard(e.target.value)} data-testid="target-board">
          <option value="" disabled>
            {msgs.chooseBoard}
          </option>
          {options.map((p) => (
            <option key={key(p)} value={key(p)}>
              {fmtBoard(msgs, p)}
            </option>
          ))}
        </select>
        {options.length === 0 && <small>{msgs.noValidTargets}</small>}
      </label>
    );
  } else if (shape === 'cell') {
    const options = validCells(state, player, card);
    ready = cell !== '';
    doConfirm = () => onConfirm({ path: fromKey(cell) });
    body = (
      <label>
        {msgs.chooseCell}
        <select value={cell} onChange={(e) => setCell(e.target.value)} data-testid="target-cell">
          <option value="" disabled>
            {msgs.chooseCell}
          </option>
          {options.map((p) => (
            <option key={key(p)} value={key(p)}>
              {fmtCell(msgs, p)}
            </option>
          ))}
        </select>
        {options.length === 0 && <small>{msgs.noValidTargets}</small>}
      </label>
    );
  } else if (shape === 'star') {
    const positions = starPositions(state, player);
    const posNum = position === '' ? null : Number(position);
    const candidatesA = posNum === null ? [] : boardsForPosition(state, player, posNum);
    const candidatesB = candidatesA.filter((p) => key(p) !== boardA);
    ready = position !== '' && boardA !== '' && boardB !== '';
    doConfirm = () =>
      onConfirm({ path: fromKey(boardA), path2: fromKey(boardB), cellIndex: Number(position) });
    body = (
      <>
        <label>
          {msgs.choosePosition}
          <select
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setBoardA('');
              setBoardB('');
            }}
            data-testid="target-position"
          >
            <option value="" disabled>
              {msgs.choosePosition}
            </option>
            {positions.map((i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
          {positions.length === 0 && <small>{msgs.noValidTargets}</small>}
        </label>
        {position !== '' && (
          <label>
            {msgs.chooseBoardA}
            <select
              value={boardA}
              onChange={(e) => {
                setBoardA(e.target.value);
                setBoardB('');
              }}
              data-testid="target-board-a"
            >
              <option value="" disabled>
                {msgs.chooseBoardA}
              </option>
              {candidatesA.map((p) => (
                <option key={key(p)} value={key(p)}>
                  {fmtBoard(msgs, p)}
                </option>
              ))}
            </select>
          </label>
        )}
        {boardA !== '' && (
          <label>
            {msgs.chooseBoardB}
            <select value={boardB} onChange={(e) => setBoardB(e.target.value)} data-testid="target-board-b">
              <option value="" disabled>
                {msgs.chooseBoardB}
              </option>
              {candidatesB.map((p) => (
                <option key={key(p)} value={key(p)}>
                  {fmtBoard(msgs, p)}
                </option>
              ))}
            </select>
          </label>
        )}
      </>
    );
  } else {
    // 'current' (correnteza)
    const origins = correntezaOrigins(state, player);
    const destinations = origin === '' ? [] : correntezaDestinations(state, player, fromKey(origin));
    ready = origin !== '' && dest !== '';
    doConfirm = () => onConfirm({ path: fromKey(origin), path2: fromKey(dest) });
    body = (
      <>
        <label>
          {msgs.chooseOrigin}
          <select
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setDest('');
            }}
            data-testid="target-origin"
          >
            <option value="" disabled>
              {msgs.chooseOrigin}
            </option>
            {origins.map((p) => (
              <option key={key(p)} value={key(p)}>
                {fmtCell(msgs, p)}
              </option>
            ))}
          </select>
          {origins.length === 0 && <small>{msgs.noValidTargets}</small>}
        </label>
        {origin !== '' && (
          <label>
            {msgs.chooseDestination}
            <select value={dest} onChange={(e) => setDest(e.target.value)} data-testid="target-dest">
              <option value="" disabled>
                {msgs.chooseDestination}
              </option>
              {destinations.map((p) => (
                <option key={key(p)} value={key(p)}>
                  {fmtCell(msgs, p)}
                </option>
              ))}
            </select>
          </label>
        )}
      </>
    );
  }

  return (
    <div className="card-target-panel" data-testid="card-target-panel">
      <p>{cardDescription(msgs, card)}</p>
      {body}
      <div className="controls">
        <button type="button" className="primary" disabled={!ready} onClick={doConfirm} data-testid="confirm-card">
          {msgs.playCard}
        </button>
        <button type="button" onClick={onCancel} data-testid="cancel-card">
          {msgs.cardCancel}
        </button>
      </div>
    </div>
  );
}
