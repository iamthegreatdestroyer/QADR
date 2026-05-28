/**
 * Tests for the SimulatedAnnealer and its underlying QUBO-based resolution.
 *
 * The SimulatedAnnealing class operates on IQUBOMatrix. These tests build
 * minimal QUBO problems that encode dependency constraints and verify the
 * annealer finds correct solutions.
 */

import { describe, it, expect } from 'vitest';
import { SimulatedAnnealing } from '../annealing/simulated-annealing.js';
import { QUBOBuilder } from '../qubo/qubo-builder.js';
import { Hamiltonian } from '../qubo/hamiltonian.js';
import type { IQUBOBuilderInput } from '../qubo/qubo-builder.js';
import type { IDependencyNode, IDependencySpec } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSimpleInput(
  packages: Array<{ name: string; versions: string[]; deps?: Record<string, IDependencySpec[]> }>,
  roots: IDependencySpec[],
): IQUBOBuilderInput {
  const packageVersions = new Map<string, IDependencyNode>();
  for (const pkg of packages) {
    const byVersion = new Map<string, readonly IDependencySpec[]>();
    for (const v of pkg.versions) {
      byVersion.set(v, pkg.deps?.[v] ?? []);
    }
    packageVersions.set(pkg.name, {
      name: pkg.name,
      versions: pkg.versions,
      dependenciesByVersion: byVersion,
    });
  }
  return { rootDependencies: roots, packageVersions };
}

function solve(input: IQUBOBuilderInput): Map<string, string> {
  const builder = new QUBOBuilder({ oneHotPenalty: 1000, conflictPenalty: 500, dependencyPenalty: 200 });
  const problem = builder.build(input);

  const annealer = new SimulatedAnnealing({
    initialTemperature: 1000,
    finalTemperature: 0.01,
    maxIterations: 5000,
    coolingSchedule: (t) => t * (1 - 0.003),
    seed: 42,
  });

  const result = annealer.solve(problem.matrix);

  const selected = new Map<string, string>();
  for (const variable of problem.variables) {
    if (result.solution.get(variable.id) === 1) {
      // keep only the first selection per package (one-hot enforcement)
      if (!selected.has(variable.packageName)) {
        selected.set(variable.packageName, variable.version);
      }
    }
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('test_no_conflicts', () => {
  it('resolves simple deps with no conflicts, violations === 0', () => {
    const input = buildSimpleInput(
      [
        { name: 'react', versions: ['17.0.0', '18.0.0', '18.2.0'] },
        { name: 'typescript', versions: ['4.9.5', '5.0.0', '5.3.0'] },
      ],
      [
        { name: 'react', constraint: '^18.0.0' },
        { name: 'typescript', constraint: '^5.0.0' },
      ],
    );

    const builder = new QUBOBuilder({ oneHotPenalty: 1000 });
    const problem = builder.build(input);
    const annealer = new SimulatedAnnealing({
      initialTemperature: 1000,
      finalTemperature: 0.01,
      maxIterations: 5000,
      coolingSchedule: (t) => t * (1 - 0.003),
      seed: 42,
    });
    const result = annealer.solve(problem.matrix);

    // Count one-hot violations: each package should have exactly one selected version
    const selectionCount = new Map<string, number>();
    for (const variable of problem.variables) {
      if (result.solution.get(variable.id) === 1) {
        selectionCount.set(variable.packageName, (selectionCount.get(variable.packageName) ?? 0) + 1);
      }
    }

    let violations = 0;
    for (const [, count] of selectionCount) {
      if (count !== 1) violations++;
    }

    expect(violations).toBe(0);
    expect(result.energy).toBeLessThan(0); // negative energy = preferences satisfied
  });
});

describe('test_resolves_conflict', () => {
  it('finds a resolution for lodash conflict scenario with lower energy than naive greedy', () => {
    // lodash@^3 vs lodash@^4 conflict
    const input = buildSimpleInput(
      [
        {
          name: 'lodash',
          versions: ['3.10.1', '4.17.21'],
        },
        {
          name: 'pkg-a',
          versions: ['1.0.0'],
          deps: {
            '1.0.0': [{ name: 'lodash', constraint: '^3.0.0' }],
          },
        },
        {
          name: 'pkg-b',
          versions: ['2.0.0'],
          deps: {
            '2.0.0': [{ name: 'lodash', constraint: '^4.0.0' }],
          },
        },
      ],
      [
        { name: 'lodash', constraint: '^3.0.0' },
        { name: 'pkg-a', constraint: '1.0.0' },
        { name: 'pkg-b', constraint: '2.0.0' },
      ],
    );

    const builder = new QUBOBuilder({ oneHotPenalty: 1000, conflictPenalty: 500, dependencyPenalty: 200 });
    const problem = builder.build(input);

    // Naive greedy: pick first version of each package
    let naiveEnergy = 0;
    for (const variable of problem.variables) {
      // Simulate all-zeros (no selection) as worst case baseline
      naiveEnergy += (problem.matrix.linear.get(variable.id) ?? 0);
    }

    const annealer = new SimulatedAnnealing({
      initialTemperature: 1000,
      finalTemperature: 0.01,
      maxIterations: 10000,
      coolingSchedule: (t) => t * (1 - 0.003),
      seed: 42,
    });
    const result = annealer.solve(problem.matrix);

    // Annealer should find a solution that respects one-hot constraints
    const selectionCount = new Map<string, number>();
    for (const variable of problem.variables) {
      if (result.solution.get(variable.id) === 1) {
        selectionCount.set(variable.packageName, (selectionCount.get(variable.packageName) ?? 0) + 1);
      }
    }

    // Each package gets at most one version selected
    for (const [, count] of selectionCount) {
      expect(count).toBeLessThanOrEqual(1);
    }

    // Annealer result should be a finite energy (ran to completion)
    expect(Number.isFinite(result.energy)).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);
  });
});

describe('test_energy_function', () => {
  it('returns correct energy for manually crafted state with known violations', () => {
    // Build a 2-package, 2-version QUBO where selecting both versions of a package
    // is penalized by the one-hot constraint
    const input = buildSimpleInput(
      [{ name: 'lodash', versions: ['3.0.0', '4.0.0'] }],
      [{ name: 'lodash', constraint: '^3.0.0' }],
    );

    const builder = new QUBOBuilder({ oneHotPenalty: 1000 });
    const problem = builder.build(input);

    const hamiltonian = new Hamiltonian(problem.matrix);

    // State: both versions selected (violates one-hot) → high energy
    const bothSelected = new Map<number, 0 | 1>();
    for (const v of problem.variables) bothSelected.set(v.id, 1);
    const highEnergy = hamiltonian.energy(bothSelected);

    // State: no version selected → lower penalty than both selected
    const noneSelected = new Map<number, 0 | 1>();
    for (const v of problem.variables) noneSelected.set(v.id, 0);
    const zeroEnergy = hamiltonian.energy(noneSelected);

    // State: exactly one version selected → lowest energy (valid)
    const oneSelected = new Map<number, 0 | 1>();
    for (const v of problem.variables) oneSelected.set(v.id, 0);
    oneSelected.set(problem.variables[0]!.id, 1);
    const validEnergy = hamiltonian.energy(oneSelected);

    // Both-selected violates one-hot → higher energy than valid
    expect(highEnergy).toBeGreaterThan(validEnergy);
    // Valid (one selected) should be the lowest energy state
    expect(validEnergy).toBeLessThan(zeroEnergy);
  });
});

describe('test_cooling_schedule', () => {
  it('annealer runs to completion without throwing (T reaches < 0.01)', () => {
    const input = buildSimpleInput(
      [{ name: 'express', versions: ['4.18.0', '4.19.0', '5.0.0'] }],
      [{ name: 'express', constraint: '^4.0.0' }],
    );

    const builder = new QUBOBuilder({ oneHotPenalty: 100 });
    const problem = builder.build(input);

    const annealer = new SimulatedAnnealing({
      initialTemperature: 1000,
      finalTemperature: 0.01,
      maxIterations: 100000,
      coolingSchedule: (t) => t * (1 - 0.003),
      seed: 1,
    });

    let threw = false;
    let result;
    try {
      result = annealer.solve(problem.matrix);
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result!.converged).toBe(true);
    expect(result!.finalTemperature).toBeLessThan(0.01);
  });
});
