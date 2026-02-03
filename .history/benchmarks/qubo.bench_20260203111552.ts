/**
 * QUBO Construction Benchmarks
 *
 * Measures the performance of building QUBO matrices from dependency graphs.
 *
 * @packageDocumentation
 */

import { bench, describe } from 'vitest';

import { QUBOBuilder } from '@qadr/core';

import { generateRandomDependencyGraph } from './utils/generators';

describe('QUBO Construction', () => {
  describe('Small graphs (< 100 packages)', () => {
    const smallGraph = generateRandomDependencyGraph({
      packages: 50,
      versionsPerPackage: 5,
      dependenciesPerVersion: 3,
    });

    bench('build QUBO matrix', () => {
      const builder = new QUBOBuilder();
      builder.buildFromDependencyGraph(smallGraph);
    });

    bench('encode constraints', () => {
      const builder = new QUBOBuilder();
      builder.encodeConstraints(smallGraph.constraints);
    });
  });

  describe('Medium graphs (100-500 packages)', () => {
    const mediumGraph = generateRandomDependencyGraph({
      packages: 250,
      versionsPerPackage: 8,
      dependenciesPerVersion: 5,
    });

    bench('build QUBO matrix', () => {
      const builder = new QUBOBuilder();
      builder.buildFromDependencyGraph(mediumGraph);
    });
  });

  describe('Large graphs (500+ packages)', () => {
    const largeGraph = generateRandomDependencyGraph({
      packages: 1000,
      versionsPerPackage: 10,
      dependenciesPerVersion: 7,
    });

    bench('build QUBO matrix', () => {
      const builder = new QUBOBuilder();
      builder.buildFromDependencyGraph(largeGraph);
    });
  });
});
