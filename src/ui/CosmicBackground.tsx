import { useMemo } from 'react';

// Camada decorativa do tema neon-galáctico (REQ-NEON-02, 06): estrelas
// cintilantes, partículas de luz subindo e criaturinhas flutuando devagar
// pelo fundo. Puramente visual: nunca captura clique/toque nem aparece pra
// leitor de tela (RN-NEON-02), e as animações contínuas somem sob
// prefers-reduced-motion (RN-NEON-04, regra em themes.css).

// Gerador determinístico (mesma semente = mesmo céu a cada carregamento,
// sem "pulo" de layout entre renders do React).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

function buildStars(seed: number, count: number): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 1 + rand() * 1.6,
    delay: rand() * 6,
    duration: 2.6 + rand() * 3.2,
  }));
}

interface Particle {
  left: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
}

function buildParticles(seed: number, count: number): Particle[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    size: 2 + rand() * 3,
    delay: rand() * 14,
    duration: 11 + rand() * 10,
    hue: rand() > 0.5 ? 0 : 1,
  }));
}

function AlienBlob() {
  return (
    <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="32" cy="28" rx="21" ry="15" />
      <path d="M15 25c-6-4-6-13 2-15" />
      <circle cx="24" cy="26" r="3" fill="currentColor" stroke="none" />
      <circle cx="40" cy="26" r="3" fill="currentColor" stroke="none" />
      <path d="M22 36c4 3 16 3 20 0" />
    </svg>
  );
}

function SpaceSlime() {
  return (
    <svg viewBox="0 0 56 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 30C2 18 12 6 28 8s26 14 20 26-40 10-42-4Z" />
      <circle cx="22" cy="20" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="34" cy="18" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TinyUfo() {
  return (
    <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="32" cy="18" rx="25" ry="7" />
      <path d="M20 14c2-8 22-8 24 0" />
      <circle cx="20" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="32" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="44" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

const CREATURES = [
  { Shape: AlienBlob, top: 10, width: 58, duration: 48, delay: -4, reverse: false, hue: '#ff7ff0' },
  { Shape: SpaceSlime, top: 64, width: 50, duration: 60, delay: -22, reverse: true, hue: '#7fe8ff' },
  { Shape: TinyUfo, top: 34, width: 60, duration: 54, delay: -38, reverse: false, hue: '#b98bff' },
];

const STAR_COUNT = 90;
const PARTICLE_COUNT = 12;

export function CosmicBackground() {
  const stars = useMemo(() => buildStars(7, STAR_COUNT), []);
  const particles = useMemo(() => buildParticles(13, PARTICLE_COUNT), []);

  return (
    <div className="cosmic-bg" aria-hidden="true">
      {stars.map((star, i) => (
        <span
          key={i}
          className="cosmic-star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      {particles.map((particle, i) => (
        <span
          key={i}
          className="cosmic-particle-wrap"
          style={{ left: `${particle.left}%` }}
        >
          <span
            className={`cosmic-particle${particle.hue ? ' alt' : ''}`}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        </span>
      ))}
      {CREATURES.map(({ Shape, top, width, duration, delay, reverse, hue }, i) => (
        <div
          key={i}
          className={`cosmic-creature${reverse ? ' reverse' : ''}`}
          style={{
            top: `${top}%`,
            color: hue,
            animationDuration: `${duration}s, ${3.2 + i * 0.5}s`,
            animationDelay: `${delay}s, ${delay}s`,
          }}
        >
          <span className="cosmic-creature-shape" style={{ width: `${width}px` }}>
            <Shape />
          </span>
        </div>
      ))}
    </div>
  );
}
