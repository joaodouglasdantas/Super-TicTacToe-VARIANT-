// Gerador determinístico (mesma semente = mesmo resultado a cada carregamento,
// sem "pulo" de layout entre renders do React). Usado pelas camadas
// decorativas (CosmicBackground, PlanetBackground) pra posicionar elementos
// com aparência aleatória sem mudar a cada re-render.
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
