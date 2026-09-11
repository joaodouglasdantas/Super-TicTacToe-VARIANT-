// Mão de cartas (spec CARTAS): mostra a mão de quem está vendo a tela
// (nomeada) e só a contagem da mão do adversário (REQ-CARTAS-07). O alvo é
// escolhido numa grade 3x3 temática (o mesmo motor visual do tabuleiro),
// não num <select> nativo — decide-se tabuleiro por tabuleiro/célula por
// célula, igual à jogada normal, sempre validado pelo motor (validateCard),
// nunca reimplementado aqui.

import { useEffect, useState } from 'react';
import { cardRarity, getNode, otherPlayer } from '../engine';
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

function fmtBoard(msgs: Messages, boardIndex: number): string {
  return `${msgs.boardLabel} ${boardIndex + 1}`;
}

function fmtCell(msgs: Messages, boardIndex: number, cellIndex: number): string {
  return `${msgs.boardLabel} ${boardIndex + 1}, ${msgs.cellLabel} ${cellIndex + 1}`;
}

export function CardHand({ msgs, state, viewerSymbol, onPlayCard }: CardHandProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const [board, setBoard] = useState<number | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [boardA, setBoardA] = useState<number | null>(null);
  const [boardB, setBoardB] = useState<number | null>(null);
  const [originBoard, setOriginBoard] = useState<number | null>(null);
  const [origin, setOrigin] = useState<number | null>(null);
  const [dest, setDest] = useState<number | null>(null);

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
    setBoard(null);
    setCell(null);
    setPosition(null);
    setBoardA(null);
    setBoardB(null);
    setOriginBoard(null);
    setOrigin(null);
    setDest(null);
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
          originBoard={originBoard}
          setOriginBoard={setOriginBoard}
          origin={origin}
          setOrigin={setOrigin}
          dest={dest}
          setDest={setDest}
        />
      )}
    </div>
  );
}

// ---- Grade 3x3 temática (substitui o <select> nativo) ----------------------

interface GridOption {
  value: number;
  label: string;
  display: string;
  disabled: boolean;
}

function GridPicker({
  name,
  options,
  selected,
  onSelect,
}: {
  name: string;
  options: GridOption[];
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="target-grid" data-testid={`${name}-grid`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`target-cell${selected === opt.value ? ' selected' : ''}`}
          disabled={opt.disabled}
          title={opt.label}
          aria-label={opt.label}
          aria-pressed={selected === opt.value}
          data-testid={`${name}-${opt.value}`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.display}
        </button>
      ))}
    </div>
  );
}

function boardOptions(msgs: Messages, valid: Path[]): GridOption[] {
  const validSet = new Set(valid.map((p) => p[0]));
  return Array.from({ length: 9 }, (_, i) => ({
    value: i,
    label: fmtBoard(msgs, i),
    display: String(i + 1),
    disabled: !validSet.has(i),
  }));
}

function cellOptions(msgs: Messages, state: GameState, boardIndex: number, valid: Set<number>): GridOption[] {
  return Array.from({ length: 9 }, (_, i) => {
    // Célula-folha (path de profundidade 2): nunca é um Board, só marca ou vazio.
    const mark = getNode(state.board, [boardIndex, i]) as Player | null;
    return {
      value: i,
      label: fmtCell(msgs, boardIndex, i),
      display: mark ?? String(i + 1),
      disabled: !valid.has(i),
    };
  });
}

function positionOptions(msgs: Messages, valid: number[]): GridOption[] {
  const validSet = new Set(valid);
  return Array.from({ length: 9 }, (_, i) => ({
    value: i,
    label: `${msgs.cellLabel} ${i + 1}`,
    display: String(i + 1),
    disabled: !validSet.has(i),
  }));
}

interface TargetPanelProps {
  msgs: Messages;
  state: GameState;
  player: Player;
  card: CardId;
  onConfirm: (target: CardTarget) => void;
  onCancel: () => void;
  board: number | null;
  setBoard: (v: number | null) => void;
  cell: number | null;
  setCell: (v: number | null) => void;
  position: number | null;
  setPosition: (v: number | null) => void;
  boardA: number | null;
  setBoardA: (v: number | null) => void;
  boardB: number | null;
  setBoardB: (v: number | null) => void;
  originBoard: number | null;
  setOriginBoard: (v: number | null) => void;
  origin: number | null;
  setOrigin: (v: number | null) => void;
  dest: number | null;
  setDest: (v: number | null) => void;
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
    originBoard,
    setOriginBoard,
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
    ready = board !== null;
    doConfirm = () => onConfirm({ path: [board!] });
    body = (
      <div>
        <p className="target-step-label">{msgs.chooseBoard}</p>
        <GridPicker name="target-board" options={boardOptions(msgs, options)} selected={board} onSelect={setBoard} />
        {options.length === 0 && <small>{msgs.noValidTargets}</small>}
      </div>
    );
  } else if (shape === 'cell') {
    const allValid = validCells(state, player, card);
    const boardsWithCells = new Set(allValid.map((p) => p[0]));
    ready = board !== null && cell !== null;
    doConfirm = () => onConfirm({ path: [board!, cell!] });
    const cellSet = board === null ? new Set<number>() : new Set(allValid.filter((p) => p[0] === board).map((p) => p[1]));
    body = (
      <div>
        <p className="target-step-label">{msgs.chooseBoard}</p>
        <GridPicker
          name="target-cell-board"
          options={boardOptions(msgs, [...boardsWithCells].map((b) => [b]))}
          selected={board}
          onSelect={(v) => {
            setBoard(v);
            setCell(null);
          }}
        />
        {allValid.length === 0 && <small>{msgs.noValidTargets}</small>}
        {board !== null && (
          <>
            <p className="target-step-label">{msgs.chooseCell}</p>
            <GridPicker name="target-cell" options={cellOptions(msgs, state, board, cellSet)} selected={cell} onSelect={setCell} />
          </>
        )}
      </div>
    );
  } else if (shape === 'star') {
    const positions = starPositions(state, player);
    const candidatesA = position === null ? [] : boardsForPosition(state, player, position);
    const candidatesB = candidatesA.filter((p) => p[0] !== boardA);
    ready = position !== null && boardA !== null && boardB !== null;
    doConfirm = () => onConfirm({ path: [boardA!], path2: [boardB!], cellIndex: position! });
    body = (
      <div>
        <p className="target-step-label">{msgs.choosePosition}</p>
        <GridPicker
          name="target-position"
          options={positionOptions(msgs, positions)}
          selected={position}
          onSelect={(v) => {
            setPosition(v);
            setBoardA(null);
            setBoardB(null);
          }}
        />
        {positions.length === 0 && <small>{msgs.noValidTargets}</small>}
        {position !== null && (
          <>
            <p className="target-step-label">{msgs.chooseBoardA}</p>
            <GridPicker
              name="target-board-a"
              options={boardOptions(msgs, candidatesA)}
              selected={boardA}
              onSelect={(v) => {
                setBoardA(v);
                setBoardB(null);
              }}
            />
          </>
        )}
        {boardA !== null && (
          <>
            <p className="target-step-label">{msgs.chooseBoardB}</p>
            <GridPicker name="target-board-b" options={boardOptions(msgs, candidatesB)} selected={boardB} onSelect={setBoardB} />
          </>
        )}
      </div>
    );
  } else {
    // 'current' (correnteza)
    const origins = correntezaOrigins(state, player);
    const boardsWithOrigins = new Set(origins.map((p) => p[0]));
    const originSet = originBoard === null ? new Set<number>() : new Set(origins.filter((p) => p[0] === originBoard).map((p) => p[1]));
    const destinations = originBoard === null || origin === null ? [] : correntezaDestinations(state, player, [originBoard, origin]);
    const destSet = new Set(destinations.map((p) => p[1]));
    ready = originBoard !== null && origin !== null && dest !== null;
    doConfirm = () => onConfirm({ path: [originBoard!, origin!], path2: [originBoard!, dest!] });
    body = (
      <div>
        <p className="target-step-label">{msgs.chooseBoard}</p>
        <GridPicker
          name="target-origin-board"
          options={boardOptions(msgs, [...boardsWithOrigins].map((b) => [b]))}
          selected={originBoard}
          onSelect={(v) => {
            setOriginBoard(v);
            setOrigin(null);
            setDest(null);
          }}
        />
        {origins.length === 0 && <small>{msgs.noValidTargets}</small>}
        {originBoard !== null && (
          <>
            <p className="target-step-label">{msgs.chooseOrigin}</p>
            <GridPicker
              name="target-origin-cell"
              options={cellOptions(msgs, state, originBoard, originSet)}
              selected={origin}
              onSelect={(v) => {
                setOrigin(v);
                setDest(null);
              }}
            />
          </>
        )}
        {originBoard !== null && origin !== null && (
          <>
            <p className="target-step-label">{msgs.chooseDestination}</p>
            <GridPicker
              name="target-dest"
              options={cellOptions(msgs, state, originBoard, destSet)}
              selected={dest}
              onSelect={setDest}
            />
          </>
        )}
      </div>
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
