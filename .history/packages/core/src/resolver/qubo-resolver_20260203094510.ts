/**
 * QUBO Resolver - Quantum-Annealed Dependency Resolution.
 *
 * Orchestrates the complete resolution pipeline:
 * 1. Fetch package metadata from ecosystem registry
 * 2. Build dependency graph
 * 3. Transform to QUBO problem
 * 4. Solve with simulated annealing / parallel tempering
 * 5. Interpret solution as resolved packages
 *
 * @example
 * ```typescript
 * const resolver = new QUBOResolver({ ecosystem: 'npm' });
 * const result = await resolver.resolve({
 *   name: 'my-app',
 *   dependencies: [
 *     { name: 'react', constraint: '^18.0.0' },
 *     { name: 'typescript', constraint: '^5.0.0' },
 *   ],
 * });
 *
 * if (result.success) {
 *   console.log('Resolved packages:', result.packages);
 * } else {
 *   console.error('Resolution failed:', result.violations);
 * }
 * ```
 */

import type { IDependencyGraph, IDependencySpec, IResolvedPackage } from '../types.js';
import type { IQUBOMatrix, IVariableMapping } from '../qubo/types.js';
import type {
  IResolverConfig,
  IResolverResult,
  IResolverProgress,
  IResolverStats,
  IViolation,
} from './types.js';
import { DEFAULT_RESOLVER_CONFIG } from './types.js';

import { QUBOBuilder } from '../qubo/qubo-builder.js';
import { Hamiltonian } from '../qubo/hamiltonian.js';
import { SimulatedAnnealing } from '../annealing/simulated-annealing.js';
import { ParallelTempering } from '../annealing/parallel-tempering.js';
import { exponentialCooling } from '../annealing/cooling-schedules.js';
import type { IAnnealingResult, IParallelTemperingResult } from '../annealing/types.js';

import {
  NpmAdapter,
  PipAdapter,
  CargoAdapter,
  MavenAdapter,
  createMemoryCache,
  type IEcosystemAdapter,
  type IPackageMetadata,
  type IAdapterOptions,
} from '../adapters/index.js';

/**
 * QUBO-based dependency resolver.
 *
 * Uses quantum-inspired optimization to find globally optimal
 * dependency resolutions, avoiding the NP-hard complexity of
 * traditional SAT-based approaches.
 */
export class QUBOResolver {
  private readonly config: Required<Omit<
    IResolverConfig,
    'registryUrl' | 'coolingSchedule' | 'onProgress' | 'signal' | 'authToken' | 'seed'
  >> &
    Pick<
      IResolverConfig,
      'registryUrl' | 'coolingSchedule' | 'onProgress' | 'signal' | 'authToken' | 'seed'
    >;
  private readonly adapter: IEcosystemAdapter;
  private readonly cache = createMemoryCache();

  /**
   * Create a new QUBO resolver.
   *
   * @param config - Resolver configuration
   */
  constructor(config: IResolverConfig = {}) {
    this.config = {
      ...DEFAULT_RESOLVER_CONFIG,
      ...config,
    };

    this.adapter = this.createAdapter(this.config.ecosystem);
  }

  /**
   * Resolve dependencies for a manifest.
   *
   * @param manifest - Root package manifest with dependencies
   * @returns Resolution result with resolved packages or violations
   */
  public async resolve(manifest: {
    name: string;
    dependencies: readonly IDependencySpec[];
    devDependencies?: readonly IDependencySpec[];
    optionalDependencies?: readonly IDependencySpec[];
  }): Promise<IResolverResult> {
    const startTime = performance.now();

    try {
      // Phase 1: Fetch all package metadata
      this.reportProgress({
        phase: 'fetching',
        progress: 0,
        message: 'Fetching package metadata...',
      });

      const graph = await this.buildDependencyGraph(
        manifest.dependencies,
        manifest.devDependencies,
        manifest.optionalDependencies
      );

      this.reportProgress({
        phase: 'fetching',
        progress: 1,
        message: `Fetched ${graph.packages.size} packages`,
        packagesFetched: graph.packages.size,
      });

      // Phase 2: Build QUBO problem
      this.reportProgress({
        phase: 'building',
        progress: 0,
        message: 'Building QUBO matrix...',
      });

      const builder = new QUBOBuilder({
        oneHotPenalty: 1000,
        conflictPenalty: 500,
        dependencyPenalty: 200,
        preferLatest: true,
      });

      const { matrix, mapping } = builder.build(graph);

      this.reportProgress({
        phase: 'building',
        progress: 1,
        message: `Built ${matrix.size}x${matrix.size} QUBO matrix`,
      });

      // Phase 3: Solve with annealing
      this.reportProgress({
        phase: 'solving',
        progress: 0,
        message: 'Starting quantum-inspired optimization...',
      });

      const annealingResult = await this.solve(matrix);

      this.reportProgress({
        phase: 'solving',
        progress: 1,
        message: `Optimization complete. Energy: ${annealingResult.energy.toFixed(2)}`,
        iteration: annealingResult.iterations,
        bestEnergy: annealingResult.energy,
      });

      // Phase 4: Interpret solution
      this.reportProgress({
        phase: 'interpreting',
        progress: 0,
        message: 'Interpreting solution...',
      });

      const { packages, violations } = this.interpretSolution(
        annealingResult.solution,
        mapping,
        graph
      );

      const endTime = performance.now();

      const stats: IResolverStats = {
        totalPackages: graph.packages.size,
        totalVersions: mapping.variables.length,
        matrixSize: matrix.size,
        numConstraints: builder.getConstraintCount(),
        iterations: annealingResult.iterations,
        finalEnergy: annealingResult.energy,
        violations: violations.length,
        timeMs: Math.round(endTime - startTime),
        cacheHitRate: this.cache.stats().hits / (this.cache.stats().hits + this.cache.stats().misses) || 0,
      };

      this.reportProgress({
        phase: 'interpreting',
        progress: 1,
        message: violations.length === 0
          ? `Resolved ${packages.length} packages`
          : `${violations.length} constraint violations`,
      });

      return {
        success: violations.length === 0,
        packages,
        violations,
        stats,
        trace: this.config.collectTrace
          ? (annealingResult as IAnnealingResult).trace
          : undefined,
        graph,
      };
    } catch (error) {
      return {
        success: false,
        packages: [],
        violations: [],
        stats: {
          totalPackages: 0,
          totalVersions: 0,
          matrixSize: 0,
          numConstraints: 0,
          iterations: 0,
          finalEnergy: Infinity,
          violations: 0,
          timeMs: Math.round(performance.now() - startTime),
        },
        error: (error as Error).message,
      };
    }
  }

  /**
   * Build dependency graph by recursively fetching metadata.
   */
  private async buildDependencyGraph(
    dependencies: readonly IDependencySpec[],
    devDependencies?: readonly IDependencySpec[],
    optionalDependencies?: readonly IDependencySpec[]
  ): Promise<IDependencyGraph> {
    const packages = new Map<string, IPackageMetadata>();
    const roots = new Set<string>();
    const edges: Array<{ from: string; to: string; constraint: string }> = [];

    // Collect all root dependencies
    const allRoots: IDependencySpec[] = [...dependencies];
    if (this.config.includeDevDeps && devDependencies) {
      allRoots.push(...devDependencies);
    }
    if (this.config.includeOptionalDeps && optionalDependencies) {
      allRoots.push(...optionalDependencies);
    }

    // BFS to fetch all transitive dependencies
    const queue: Array<{ spec: IDependencySpec; depth: number; from?: string }> = 
      allRoots.map((spec) => ({ spec, depth: 0 }));
    const visited = new Set<string>();

    const adapterOptions: IAdapterOptions = {
      registryUrl: this.config.registryUrl,
      authToken: this.config.authToken,
      signal: this.config.signal,
      cache: this.cache,
    };

    while (queue.length > 0) {
      // Batch fetch to reduce round trips
      const batch = queue.splice(0, 20);
      const toFetch = batch.filter((item) => !visited.has(item.spec.name));

      if (toFetch.length > 0) {
        const names = toFetch.map((item) => item.spec.name);
        const metadatas = await this.adapter.fetchPackages(names, adapterOptions);

        for (const item of toFetch) {
          const { spec, depth, from } = item;
          visited.add(spec.name);

          if (depth === 0) {
            roots.add(spec.name);
          }

          if (from) {
            edges.push({ from, to: spec.name, constraint: spec.constraint });
          }

          const metadata = metadatas.get(spec.name);
          if (!metadata) continue;

          packages.set(spec.name, metadata);

          // Add transitive dependencies to queue
          if (depth < this.config.maxDepth) {
            for (const version of metadata.versions.slice(
              0,
              this.config.maxVersionsPerPackage
            )) {
              for (const dep of version.dependencies) {
                if (!visited.has(dep.name)) {
                  queue.push({
                    spec: dep,
                    depth: depth + 1,
                    from: spec.name,
                  });
                }
              }
            }
          }

          // Report progress
          this.reportProgress({
            phase: 'fetching',
            progress: visited.size / (visited.size + queue.length),
            message: `Fetched ${spec.name}`,
            packagesFetched: packages.size,
          });
        }
      }
    }

    // Transform to IDependencyGraph
    const graphPackages = new Map<string, {
      name: string;
      versions: readonly string[];
      dependencies: ReadonlyMap<string, readonly IDependencySpec[]>;
    }>();

    for (const [name, metadata] of packages) {
      const versionDeps = new Map<string, readonly IDependencySpec[]>();

      for (const version of metadata.versions.slice(
        0,
        this.config.maxVersionsPerPackage
      )) {
        versionDeps.set(version.version, version.dependencies);
      }

      graphPackages.set(name, {
        name,
        versions: metadata.versions
          .slice(0, this.config.maxVersionsPerPackage)
          .map((v) => v.version),
        dependencies: versionDeps,
      });
    }

    return {
      packages: graphPackages,
      roots: new Set(allRoots.map((d) => d.name)),
      constraints: new Map(allRoots.map((d) => [d.name, d.constraint])),
    };
  }

  /**
   * Solve the QUBO problem.
   */
  private async solve(
    matrix: IQUBOMatrix
  ): Promise<IAnnealingResult | IParallelTemperingResult> {
    const coolingSchedule =
      this.config.coolingSchedule ??
      exponentialCooling(0.995);

    const progressCallback = this.config.onProgress
      ? (state: { iteration: number; temperature: number; bestEnergy: number }) => {
          this.reportProgress({
            phase: 'solving',
            progress: state.iteration / this.config.maxIterations,
            message: `Iteration ${state.iteration}`,
            iteration: state.iteration,
            bestEnergy: state.bestEnergy,
            temperature: state.temperature,
          });
        }
      : undefined;

    const hamiltonian = new Hamiltonian(matrix);

    if (this.config.useParallelTempering) {
      const solver = new ParallelTempering();
      return solver.solve(hamiltonian, {
        numReplicas: this.config.numReplicas,
        minTemperature: this.config.finalTemperature,
        maxTemperature: this.config.initialTemperature,
        maxIterations: this.config.maxIterations,
        maxTimeSeconds: this.config.maxTimeSeconds,
        seed: this.config.seed,
        onProgress: progressCallback,
      });
    } else {
      const solver = new SimulatedAnnealing();
      return solver.solve(hamiltonian, {
        initialTemperature: this.config.initialTemperature,
        finalTemperature: this.config.finalTemperature,
        maxIterations: this.config.maxIterations,
        coolingSchedule,
        seed: this.config.seed,
        collectTrace: this.config.collectTrace,
        onProgress: progressCallback,
        signal: this.config.signal,
      });
    }
  }

  /**
   * Interpret binary solution as resolved packages.
   */
  private interpretSolution(
    solution: readonly number[],
    mapping: IVariableMapping,
    graph: IDependencyGraph
  ): { packages: IResolvedPackage[]; violations: IViolation[] } {
    const packages: IResolvedPackage[] = [];
    const violations: IViolation[] = [];

    // Track selected versions per package
    const selectedVersions = new Map<string, string[]>();

    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === 1) {
        const variable = mapping.variables[i];
        if (!variable) continue;

        const { packageName, version } = variable;

        if (!selectedVersions.has(packageName)) {
          selectedVersions.set(packageName, []);
        }
        selectedVersions.get(packageName)!.push(version);
      }
    }

    // Check for one-hot violations and build resolved packages
    for (const [packageName, versions] of selectedVersions) {
      if (versions.length === 0) {
        // Package required but not selected
        if (graph.roots.has(packageName)) {
          violations.push({
            type: 'one_hot',
            packages: [packageName],
            message: `Required package ${packageName} has no version selected`,
            penalty: 1000,
          });
        }
      } else if (versions.length > 1) {
        // Multiple versions selected
        violations.push({
          type: 'one_hot',
          packages: [packageName],
          message: `Package ${packageName} has multiple versions selected: ${versions.join(', ')}`,
          penalty: 1000,
        });
      } else {
        // Exactly one version selected - this is correct
        packages.push({
          name: packageName,
          version: versions[0]!,
          dependencies: this.getVersionDependencies(graph, packageName, versions[0]!),
        });
      }
    }

    // Check for missing required packages
    for (const rootName of graph.roots) {
      if (!selectedVersions.has(rootName)) {
        violations.push({
          type: 'dependency',
          packages: [rootName],
          message: `Required dependency ${rootName} was not resolved`,
          penalty: 200,
        });
      }
    }

    // Sort packages alphabetically
    packages.sort((a, b) => a.name.localeCompare(b.name));

    return { packages, violations };
  }

  /**
   * Get dependencies for a specific package version.
   */
  private getVersionDependencies(
    graph: IDependencyGraph,
    packageName: string,
    version: string
  ): readonly string[] {
    const pkg = graph.packages.get(packageName);
    if (!pkg) return [];

    const deps = pkg.dependencies.get(version);
    if (!deps) return [];

    return deps.map((d) => d.name);
  }

  /**
   * Report progress to callback.
   */
  private reportProgress(progress: IResolverProgress): void {
    this.config.onProgress?.(progress);
  }

  /**
   * Create ecosystem adapter.
   */
  private createAdapter(ecosystem: string): IEcosystemAdapter {
    switch (ecosystem) {
      case 'npm':
        return new NpmAdapter();
      case 'pip':
        return new PipAdapter();
      case 'cargo':
        return new CargoAdapter();
      case 'maven':
        return new MavenAdapter();
      default:
        throw new Error(`Unknown ecosystem: ${ecosystem}`);
    }
  }

  /**
   * Get current cache statistics.
   */
  public getCacheStats(): { hits: number; misses: number; size: number } {
    return this.cache.stats();
  }

  /**
   * Clear the metadata cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
