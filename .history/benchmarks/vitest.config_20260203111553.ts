import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    benchmark: {
      include: ['**/*.bench.ts'],
      exclude: ['**/node_modules/**'],
      reporters: ['default', 'json'],
      outputFile: './benchmark-results/results.json',
    },
    alias: {
      '@qadr/core': '../packages/core/src',
    },
  },
});
