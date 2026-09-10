import type { MapTheme } from '../theme/maps';
import { BeachBackground } from './BeachBackground';
import { CosmicBackground } from './CosmicBackground';

// Escolhe a camada decorativa pelo mapa sorteado da partida (spec MAPAS).
export function MapBackground({ map }: { map: MapTheme }) {
  return map === 'beach' ? <BeachBackground /> : <CosmicBackground />;
}
