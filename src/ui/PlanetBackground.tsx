import { useMemo } from 'react';
import { mulberry32 } from './random';

// Fundo da tela inicial (spec NEON, home): bem mais simples que o do jogo em
// si — preto puro e uma dezena de planetas de "kits" bem diferentes
// flutuando devagar, feito só de gradientes CSS (sem imagem/asset externo).
// Puramente visual: nunca captura clique/toque nem aparece pra leitor de
// tela, e some sob prefers-reduced-motion (mesmo padrão do CosmicBackground).

const PLANET_KINDS = ['lava', 'ice', 'rainbow', 'galaxy', 'weird'] as const;
type PlanetKind = (typeof PLANET_KINDS)[number];

interface Planet {
  kind: PlanetKind;
  top: number;
  left: number;
  size: number;
  ring: boolean;
  duration: number;
  delay: number;
  bobDuration: number;
}

const PLANET_COUNT = 9;

function buildPlanets(seed: number, count: number): Planet[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    kind: PLANET_KINDS[i % PLANET_KINDS.length],
    top: rand() * 92,
    left: rand() * 92,
    size: 46 + rand() * 84,
    ring: rand() > 0.62,
    duration: 34 + rand() * 30,
    delay: -rand() * 40,
    bobDuration: 5 + rand() * 4,
  }));
}

export function PlanetBackground() {
  const planets = useMemo(() => buildPlanets(29, PLANET_COUNT), []);

  return (
    <div className="planet-bg" aria-hidden="true">
      {planets.map((planet, i) => (
        <div
          key={i}
          className="planet-orbit"
          style={{
            top: `${planet.top}%`,
            left: `${planet.left}%`,
            animationDuration: `${planet.duration}s`,
            animationDelay: `${planet.delay}s`,
          }}
        >
          <span
            className={`planet planet-${planet.kind}${planet.ring ? ' has-ring' : ''}`}
            style={{
              width: `${planet.size}px`,
              height: `${planet.size}px`,
              animationDuration: `${planet.bobDuration}s`,
              animationDelay: `${planet.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
