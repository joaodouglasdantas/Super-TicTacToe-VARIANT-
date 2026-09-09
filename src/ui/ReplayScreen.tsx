import { useEffect, useMemo, useState } from 'react';
import { soundsForTransition } from '../audio/events';
import { playMoveSounds } from '../audio/sound';
import { replay } from '../engine';
import type { Messages } from '../i18n';
import { exportEntry } from '../replay/exchange';
import { generateGif } from '../replay/gif';
import type { LibraryEntry } from '../replay/library';
import { BoardView } from './BoardView';
import { Ellipsis } from './Ellipsis';

interface ReplayScreenProps {
  msgs: Messages;
  entry: LibraryEntry;
  onBack: () => void;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadEntryJson(entry: LibraryEntry): void {
  const { text, filename } = exportEntry(entry);
  downloadBlob(new Blob([text], { type: 'application/json' }), filename);
}

export async function downloadEntryGif(entry: LibraryEntry): Promise<void> {
  const { filename } = exportEntry(entry);
  downloadBlob(await generateGif(entry), filename.replace(/\.json$/, '.gif'));
}

// Player de replay (REQ-REPLAY-03): somente leitura, estados derivados por
// replay determinístico do motor (RN-REPLAY-02, 05).
export function ReplayScreen({ msgs, entry, onBack }: ReplayScreenProps) {
  const total = entry.moves.length;
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);

  const state = useMemo(
    () => replay({ config: entry.config, moves: entry.moves.slice(0, step) }),
    [entry, step],
  );

  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStep((s) => {
        const next = Math.min(total, s + 1);
        if (next !== s) {
          const before = replay({ config: entry.config, moves: entry.moves.slice(0, s) });
          const after = replay({ config: entry.config, moves: entry.moves.slice(0, next) });
          playMoveSounds(soundsForTransition(before, after));
        }
        return next;
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [playing, step, total, entry]);

  const lastMove = step > 0 ? entry.moves[step - 1].path : null;

  return (
    <section className="game replay">
      <h2>
        {msgs.replayTitle}: <span className="mark-X">{entry.names.X || 'X'}</span> vs{' '}
        <span className="mark-O">{entry.names.O || 'O'}</span>
      </h2>

      <BoardView
        board={state.board}
        path={[]}
        allowed={new Set()}
        lastMove={lastMove}
        tiebreak={entry.config.tiebreak}
        onCellClick={() => {}}
        animateStrikes={playing}
      />

      <p className="replay-counter" data-testid="replay-counter">
        {msgs.moveNumber} {step} / {total}
      </p>

      {/* REQ-REPLAY2-06: o passo a passo fica num grupo, e reproduzir/pausar
          é um botão redondo destacado, sem parecer variação de avançar. */}
      <div className="replay-controls">
        <div className="step-group">
          <button type="button" title={msgs.firstBtn} aria-label={msgs.firstBtn}
            data-testid="replay-first" disabled={step === 0}
            onClick={() => { setPlaying(false); setStep(0); }}>
            |‹‹
          </button>
          <button type="button" title={msgs.prevBtn} aria-label={msgs.prevBtn}
            data-testid="replay-prev" disabled={step === 0}
            onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}>
            ‹
          </button>
        </div>

        <button type="button" className="play-button" data-testid="replay-play"
          title={playing ? msgs.pauseBtn : msgs.playBtn}
          aria-label={playing ? msgs.pauseBtn : msgs.playBtn}
          onClick={() => {
            if (!playing && step >= total) setStep(0);
            setPlaying((p) => !p);
          }}>
          {playing ? '❚❚' : '▶'}
        </button>

        <div className="step-group">
          <button type="button" title={msgs.nextBtn} aria-label={msgs.nextBtn}
            data-testid="replay-next" disabled={step === total}
            onClick={() => { setPlaying(false); setStep((s) => Math.min(total, s + 1)); }}>
            ›
          </button>
          <button type="button" title={msgs.lastBtn} aria-label={msgs.lastBtn}
            data-testid="replay-last" disabled={step === total}
            onClick={() => { setPlaying(false); setStep(total); }}>
            ››|
          </button>
        </div>
      </div>

      <div className="controls">
        <button
          type="button"
          data-testid="replay-gif"
          disabled={generating}
          onClick={async () => {
            // RN-REPLAY2-04: aviso visual enquanto o GIF é gerado.
            setGenerating(true);
            try {
              await downloadEntryGif(entry);
            } finally {
              setGenerating(false);
            }
          }}
        >
          {generating ? (
            <>
              {msgs.generatingGif}
              <Ellipsis />
            </>
          ) : (
            msgs.downloadGif
          )}
        </button>
        <button type="button" data-testid="replay-export" onClick={() => downloadEntryJson(entry)}>
          {msgs.exportMatch}
        </button>
        <button type="button" onClick={onBack} data-testid="replay-back">
          {msgs.back}
        </button>
      </div>
    </section>
  );
}
