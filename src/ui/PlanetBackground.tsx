// Fundo da tela inicial (spec NEON, home): a arte de planetas do usuário
// (public/home-planets.png), com um zoom/pan bem lento pra não ficar estática
// (RN-NEON-04: para sob prefers-reduced-motion, regra em themes.css).
// BASE_URL entra explícito porque o site é publicado numa subpasta do
// GitHub Pages (mesmo motivo dos sons antigos em public/sounds/, ver spec SOM).
export function PlanetBackground() {
  return (
    <div
      className="planet-bg"
      aria-hidden="true"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}home-planets.png)` }}
    />
  );
}
