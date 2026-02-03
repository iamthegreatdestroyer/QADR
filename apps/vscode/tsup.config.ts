import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  external: ['vscode'],
  noExternal: [
    '@qadr/core',
    '@qadr/semver',
    '@qadr/shared',
    '@qadr/config',
  ],
  platform: 'node',
  target: 'node18',
  minify: false,
  treeshake: true,
  esbuildOptions(options) {
    options.mainFields = ['module', 'main'];
  },
});
