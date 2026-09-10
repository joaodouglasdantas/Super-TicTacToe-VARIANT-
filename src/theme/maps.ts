// Sorteio do mapa de uma partida nova (spec MAPAS). O tipo em si mora no
// motor (src/engine/types.ts) desde a spec CARTAS, que deu a cada mapa seu
// próprio baralho — deixou de ser só cosmético (RN-MAPAS-01 vale só pro
// mapa em si; os efeitos de carta é que mexem em regra, não o mapa).

import type { MapTheme } from '../engine';

export type { MapTheme };

export const MAP_THEMES: MapTheme[] = ['galaxy', 'beach'];

function isMapTheme(value: unknown): value is MapTheme {
  return value === 'galaxy' || value === 'beach';
}

// Garante um mapa válido a partir de dado possivelmente ausente/antigo
// (REQ-MAPAS-05): partida salva antes desta entrega vira galáxia.
export function normalizeMap(value: unknown): MapTheme {
  return isMapTheme(value) ? value : 'galaxy';
}

// RN-MAPAS-03: só quem cria a partida sorteia (local: quem começa; online: o
// host). `rand` é injetável pra teste determinístico, mesmo padrão de
// generateRoomCode em src/p2p/protocol.ts. Em produção, um hook de teste e2e
// (localStorage 'stt.forceMap') deixa forçar o mapa sem depender de sorte —
// ver leitura em randomMapTheme.
export function randomMapTheme(rand: () => number = Math.random): MapTheme {
  try {
    const forced = localStorage.getItem('stt.forceMap');
    if (isMapTheme(forced)) return forced;
  } catch {
    // sem localStorage: segue pro sorteio normal
  }
  return MAP_THEMES[Math.floor(rand() * MAP_THEMES.length)];
}
