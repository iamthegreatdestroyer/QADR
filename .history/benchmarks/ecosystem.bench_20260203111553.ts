/**
 * Ecosystem Adapter Benchmarks
 *
 * Measures performance of real-world package resolution.
 *
 * @packageDocumentation
 */

import { bench, describe } from 'vitest';

import { NpmAdapter, PipAdapter, QUBOResolver } from '@qadr/core';

describe('npm Ecosystem', () => {
  const adapter = new NpmAdapter();
  const resolver = new QUBOResolver({ adapter });

  describe('Small projects', () => {
    bench('resolve lodash@latest', async () => {
      await resolver.resolve({ lodash: '^4.17.0' });
    });

    bench('resolve express@latest', async () => {
      await resolver.resolve({ express: '^4.18.0' });
    });
  });

  describe('Medium projects', () => {
    bench('resolve react + react-dom', async () => {
      await resolver.resolve({
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      });
    });

    bench('resolve typescript + eslint', async () => {
      await resolver.resolve({
        typescript: '^5.0.0',
        eslint: '^8.0.0',
        '@typescript-eslint/parser': '^6.0.0',
      });
    });
  });

  describe('Large projects', () => {
    bench('resolve Next.js starter deps', async () => {
      await resolver.resolve({
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0',
        typescript: '^5.0.0',
        tailwindcss: '^3.0.0',
      });
    });
  });
});

describe('pip Ecosystem', () => {
  const adapter = new PipAdapter();
  const resolver = new QUBOResolver({ adapter });

  describe('Common packages', () => {
    bench('resolve requests', async () => {
      await resolver.resolve({ requests: '>=2.28.0' });
    });

    bench('resolve flask', async () => {
      await resolver.resolve({ flask: '>=2.0.0' });
    });

    bench('resolve django', async () => {
      await resolver.resolve({ django: '>=4.0.0' });
    });
  });

  describe('Data science stack', () => {
    bench('resolve numpy + pandas', async () => {
      await resolver.resolve({
        numpy: '>=1.24.0',
        pandas: '>=2.0.0',
      });
    });
  });
});
