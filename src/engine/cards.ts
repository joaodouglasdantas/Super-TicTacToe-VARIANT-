// Baralhos de carta por mapa e sorteio determinístico (spec CARTAS).
// Motor puro: nenhuma dependência de UI (mesma regra do resto de src/engine/).

import type { CardId, CardRarity, MapTheme } from './types';

export interface CardDef {
  id: CardId;
  rarity: CardRarity;
}

// REQ-CARTAS-08, 09: um baralho de 4 cartas por mapa (1 comum, 2 raras, 1 épica).
export const CARD_DECKS: Record<MapTheme, CardDef[]> = {
  galaxy: [
    { id: 'salto-estelar', rarity: 'common' },
    { id: 'buraco-negro', rarity: 'rare' },
    { id: 'estrela-da-sorte', rarity: 'rare' },
    { id: 'devorador-de-tabuleiro', rarity: 'epic' },
  ],
  beach: [
    { id: 'bolha-protecao', rarity: 'common' },
    { id: 'correnteza', rarity: 'rare' },
    { id: 'tempestade', rarity: 'rare' },
    { id: 'tsunami', rarity: 'epic' },
  ],
};

export function cardMap(card: CardId): MapTheme {
  return CARD_DECKS.galaxy.some((c) => c.id === card) ? 'galaxy' : 'beach';
}

export function cardRarity(card: CardId): CardRarity {
  for (const deck of Object.values(CARD_DECKS)) {
    const found = deck.find((c) => c.id === card);
    if (found) return found.rarity;
  }
  throw new Error(`carta desconhecida: ${card}`);
}

// REQ-CARTAS-02: 60% comum, 30% rara, 10% épica.
const RARITY_ROLL: [CardRarity, number][] = [
  ['common', 0.6],
  ['rare', 0.9], // acumulado: 0.6 + 0.3
  ['epic', 1], // acumulado: 0.9 + 0.1
];

// PRNG determinístico e barato (mesmo algoritmo usado em src/ui/random.ts,
// duplicado aqui porque o motor não importa de src/ui/ — nunca a UI que
// importa dele, RN de arquitetura já seguida por src/bot/ antes de sair).
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

// RN-MAPAS-03/REQ-CARTAS-11: determinístico a partir de `seed` (o índice da
// jogada que fechou o tabuleiro), não de Math.random — os dois lados de uma
// partida online replayam o mesmo histórico e concordam sem trocar mensagem
// nenhuma sobre qual carta saiu.
export function drawCard(map: MapTheme, seed: number): CardId {
  const rand = mulberry32(seed);
  const roll = rand();
  const [rarity] = RARITY_ROLL.find(([, upTo]) => roll < upTo) ?? RARITY_ROLL[0];
  const pool = CARD_DECKS[map].filter((c) => c.rarity === rarity);
  const pick = pool[Math.floor(rand() * pool.length)] ?? CARD_DECKS[map][0];
  return pick.id;
}
