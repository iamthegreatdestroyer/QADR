import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/qadr': 'src/bin/qadr.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'node18',
  external: [
    '@qadr/config',
    '@qadr/core',
    '@qadr/semver',
    '@qadr/shared',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node\n',
    };
  },
});
