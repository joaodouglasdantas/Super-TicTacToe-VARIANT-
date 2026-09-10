import { useMemo } from 'react';
import { mulberry32 } from './random';

// Camada decorativa do mapa praia (spec MAPAS, REQ-MAPAS-02, 07): bolhas
// subindo e criaturas aquáticas flutuando, mesmo motor visual do mapa
// galáxia (CosmicBackground) — só troca conteúdo/paleta. Puramente visual:
// nunca captura clique/toque nem aparece pra leitor de tela, e some sob
// prefers-reduced-motion (mesma regra em themes.css).

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
}

function buildBubbles(seed: number, count: number): Bubble[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    size: 2 + rand() * 4,
    delay: rand() * 14,
    duration: 9 + rand() * 9,
    hue: rand() > 0.5 ? 0 : 1,
  }));
}

function Fish() {
  return (
    <svg viewBox="0 0 64 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18c8-10 30-10 38 0-8 10-30 10-38 0Z" />
      <path d="M44 18l14-9v18Z" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Jellyfish() {
  return (
    <svg viewBox="0 0 48 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 22c0-11 8-19 18-19s18 8 18 19c-3 3-33 3-36 0Z" />
      <path d="M12 23c0 5 3 6 3 6s-2 3 0 6" />
      <path d="M22 24c0 5 3 6 3 6s-2 3 0 6" />
      <path d="M32 23c0 5 3 6 3 6s-2 3 0 6" />
    </svg>
  );
}

function Seahorse() {
  return (
    <svg viewBox="0 0 40 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 6c7 0 9 5 7 10-2 4-8 4-8 9 0 4 6 4 7 9 1 5-3 9-8 9-6 0-10-4-10-10 0-5 4-6 4-10 0-3-3-4-3-8 0-6 4-9 11-9Z" />
      <circle cx="23" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

const CREATURES = [
  { Shape: Fish, top: 14, width: 56, duration: 50, delay: -6, reverse: false, hue: '#ff9d5c' },
  { Shape: Jellyfish, top: 60, width: 42, duration: 58, delay: -24, reverse: true, hue: '#ff9ecf' },
  { Shape: Seahorse, top: 36, width: 40, duration: 52, delay: -40, reverse: false, hue: '#ffd76a' },
];

const BUBBLE_COUNT = 16;

export function BeachBackground() {
  const bubbles = useMemo(() => buildBubbles(41, BUBBLE_COUNT), []);

  return (
    <div className="beach-bg" aria-hidden="true">
      {bubbles.map((bubble, i) => (
        <span key={i} className="beach-bubble-wrap" style={{ left: `${bubble.left}%` }}>
          <span
            className={`beach-bubble${bubble.hue ? ' alt' : ''}`}
            style={{
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`,
            }}
          />
        </span>
      ))}
      {CREATURES.map(({ Shape, top, width, duration, delay, reverse, hue }, i) => (
        <div
          key={i}
          className={`beach-creature${reverse ? ' reverse' : ''}`}
          style={{
            top: `${top}%`,
            color: hue,
            animationDuration: `${duration}s, ${3.2 + i * 0.5}s`,
            animationDelay: `${delay}s, ${delay}s`,
          }}
        >
          <span className="beach-creature-shape" style={{ width: `${width}px` }}>
            <Shape />
          </span>
        </div>
      ))}
    </div>
  );
}
