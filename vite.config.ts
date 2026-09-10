import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_BASE é definido no CI como "/Super-TicTacToe/" pro GitHub Pages;
// localmente fica "/" pra dev e preview funcionarem sem prefixo.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // O minificador padrão (Lightning CSS) funde `backdrop-filter` com
  // `-webkit-backdrop-filter` e descarta a propriedade padrão sem prefixo —
  // resultado: botões grandes (ex. os da home) ficam sem borda/fundo/texto
  // no build de produção (some tudo menos o ícone). Sem `esbuild` instalado
  // nesta variante do Vite (rolldown-vite) pra usar como minificador
  // alternativo, desliga a minificação de CSS: arquivo ~15KB, sem risco
  // pro tamanho do build.
  build: {
    cssMinify: false,
  },
  test: {
    include: [
      'tests/engine/**/*.test.ts',
      'tests/p2p/**/*.test.ts',
      'tests/replay/**/*.test.ts',
    ],
    environment: 'node',
    globals: true,
    // As partidas bot contra bot no nível difícil passam folgado de 5s.
    testTimeout: 60_000,
  },
});
