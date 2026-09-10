// Mapas visuais sorteados por partida (spec MAPAS). Puramente cosmético
// (RN-MAPAS-01): nenhuma regra de jogo depende do mapa.

export type MapTheme = 'galaxy' | 'beach';

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
