/**
 * Annealing Algorithm Benchmarks
 *
 * Measures convergence speed and solution quality of annealing algorithms.
 *
 * @packageDocumentation
 */

import { bench, describe } from 'vitest';

import { ParallelTempering, QUBOBuilder, SimulatedAnnealing } from '@qadr/core';

import { generateRandomDependencyGraph } from './utils/generators';

describe('Simulated Annealing', () => {
  const graph = generateRandomDependencyGraph({
    packages: 200,
    versionsPerPackage: 6,
    dependenciesPerVersion: 4,
  });

  const builder = new QUBOBuilder();
  const qubo = builder.buildFromDependencyGraph(graph);

  describe('Linear cooling schedule', () => {
    bench('1000 iterations', () => {
      const annealer = new SimulatedAnnealing({
        initialTemperature: 100,
        finalTemperature: 0.01,
        coolingSchedule: 'linear',
        maxIterations: 1000,
      });
      annealer.solve(qubo);
    });

    bench('5000 iterations', () => {
      const annealer = new SimulatedAnnealing({
        initialTemperature: 100,
        finalTemperature: 0.01,
        coolingSchedule: 'linear',
        maxIterations: 5000,
      });
      annealer.solve(qubo);
    });
  });

  describe('Exponential cooling schedule', () => {
    bench('1000 iterations', () => {
      const annealer = new SimulatedAnnealing({
        initialTemperature: 100,
        finalTemperature: 0.01,
        coolingSchedule: 'exponential',
        coolingRate: 0.995,
        maxIterations: 1000,
      });
      annealer.solve(qubo);
    });
  });

  describe('Adaptive cooling schedule', () => {
    bench('1000 iterations', () => {
      const annealer = new SimulatedAnnealing({
        initialTemperature: 100,
        finalTemperature: 0.01,
        coolingSchedule: 'adaptive',
        maxIterations: 1000,
      });
      annealer.solve(qubo);
    });
  });
});

describe('Parallel Tempering', () => {
  const graph = generateRandomDependencyGraph({
    packages: 300,
    versionsPerPackage: 8,
    dependenciesPerVersion: 5,
  });

  const builder = new QUBOBuilder();
  const qubo = builder.buildFromDependencyGraph(graph);

  bench('4 replicas', () => {
    const pt = new ParallelTempering({
      numReplicas: 4,
      temperatureRange: [0.1, 100],
      swapInterval: 10,
      iterationsPerReplica: 500,
    });
    pt.solve(qubo);
  });

  bench('8 replicas', () => {
    const pt = new ParallelTempering({
      numReplicas: 8,
      temperatureRange: [0.1, 100],
      swapInterval: 10,
      iterationsPerReplica: 500,
    });
    pt.solve(qubo);
  });

  bench('16 replicas', () => {
    const pt = new ParallelTempering({
      numReplicas: 16,
      temperatureRange: [0.1, 100],
      swapInterval: 10,
      iterationsPerReplica: 500,
    });
    pt.solve(qubo);
  });
});
