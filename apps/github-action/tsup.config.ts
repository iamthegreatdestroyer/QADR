import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'node18',
  outDir: 'dist',
  noExternal: [
    '@qadr/core',
    '@qadr/config',
    '@qadr/shared',
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '// QADR GitHub Action - Quantum-Annealed Dependency Resolution',
    };
  },
});
