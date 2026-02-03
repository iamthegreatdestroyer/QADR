/**
 * Benchmark Data Generators
 *
 * Utilities for generating synthetic dependency graphs for benchmarking.
 *
 * @packageDocumentation
 */

import type { IDependencyGraph, IPackageVersion } from '@qadr/core';

export interface IGraphGeneratorOptions {
  /** Number of unique packages */
  packages: number;
  /** Average versions per package */
  versionsPerPackage: number;
  /** Average dependencies per version */
  dependenciesPerVersion: number;
  /** Seed for reproducible generation */
  seed?: number;
}

/**
 * Simple seeded random number generator (Mulberry32)
 */
function createRng(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a random dependency graph for benchmarking purposes.
 *
 * Creates a synthetic but realistic dependency graph with specified parameters.
 * The graph follows patterns observed in real package ecosystems:
 * - Power-law distribution of dependencies
 * - Semver-like version strings
 * - Transitive dependency chains
 */
export function generateRandomDependencyGraph(options: IGraphGeneratorOptions): IDependencyGraph {
  const { packages, versionsPerPackage, dependenciesPerVersion, seed = 42 } = options;

  const rng = createRng(seed);
  const packageNames = Array.from({ length: packages }, (_, i) => `pkg-${i}`);

  const versions = new Map<string, IPackageVersion[]>();

  // Generate versions for each package
  for (const name of packageNames) {
    const numVersions = Math.max(1, Math.floor(rng() * versionsPerPackage * 2));
    const packageVersions: IPackageVersion[] = [];

    for (let v = 0; v < numVersions; v++) {
      const major = Math.floor(v / 10);
      const minor = v % 10;
      const patch = Math.floor(rng() * 10);

      packageVersions.push({
        name,
        version: `${major}.${minor}.${patch}`,
        dependencies: {},
      });
    }

    versions.set(name, packageVersions);
  }

  // Add dependencies (only to packages that come later in the list to avoid cycles)
  for (let i = 0; i < packageNames.length; i++) {
    const name = packageNames[i]!;
    const packageVersions = versions.get(name)!;

    for (const version of packageVersions) {
      const numDeps = Math.floor(rng() * dependenciesPerVersion * 2);

      for (let d = 0; d < numDeps && i + 1 < packageNames.length; d++) {
        // Pick a random package that comes after this one
        const depIndex = i + 1 + Math.floor(rng() * (packageNames.length - i - 1));
        const depName = packageNames[depIndex];

        if (depName && !version.dependencies[depName]) {
          const depVersions = versions.get(depName);
          if (depVersions && depVersions.length > 0) {
            const depVersion = depVersions[Math.floor(rng() * depVersions.length)]!;
            version.dependencies[depName] = `^${depVersion.version}`;
          }
        }
      }
    }
  }

  return {
    packages: versions,
    root: {
      name: 'root',
      version: '1.0.0',
      dependencies: Object.fromEntries(
        packageNames.slice(0, Math.min(10, packages)).map((name) => {
          const pkgVersions = versions.get(name)!;
          const latest = pkgVersions[pkgVersions.length - 1]!;
          return [name, `^${latest.version}`];
        })
      ),
    },
    constraints: [],
  };
}

/**
 * Generates a deeply nested dependency tree (worst case for many resolvers).
 */
export function generateDeepDependencyChain(depth: number): IDependencyGraph {
  const versions = new Map<string, IPackageVersion[]>();

  for (let i = 0; i < depth; i++) {
    const name = `deep-pkg-${i}`;
    const deps: Record<string, string> = {};

    if (i + 1 < depth) {
      deps[`deep-pkg-${i + 1}`] = '^1.0.0';
    }

    versions.set(name, [
      {
        name,
        version: '1.0.0',
        dependencies: deps,
      },
    ]);
  }

  return {
    packages: versions,
    root: {
      name: 'root',
      version: '1.0.0',
      dependencies: depth > 0 ? { 'deep-pkg-0': '^1.0.0' } : {},
    },
    constraints: [],
  };
}

/**
 * Generates a diamond dependency pattern (common conflict scenario).
 */
export function generateDiamondDependency(): IDependencyGraph {
  const versions = new Map<string, IPackageVersion[]>();

  // Shared dependency with multiple versions
  versions.set('shared', [
    { name: 'shared', version: '1.0.0', dependencies: {} },
    { name: 'shared', version: '2.0.0', dependencies: {} },
  ]);

  // Two packages that depend on different versions of shared
  versions.set('left', [{ name: 'left', version: '1.0.0', dependencies: { shared: '^1.0.0' } }]);

  versions.set('right', [{ name: 'right', version: '1.0.0', dependencies: { shared: '^2.0.0' } }]);

  return {
    packages: versions,
    root: {
      name: 'root',
      version: '1.0.0',
      dependencies: {
        left: '^1.0.0',
        right: '^1.0.0',
      },
    },
    constraints: [],
  };
}
