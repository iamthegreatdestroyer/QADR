/**
 * QUBO Resolver - Quantum-Annealed Dependency Resolution.
 *
 * Orchestrates the complete resolution pipeline:
 * 1. Fetch package metadata from ecosystem registry
 * 2. Build dependency graph
 * 3. Transform to QUBO problem
 * 4. Solve with simulated annealing / parallel tempering
 * 5. Interpret solution as resolved packages
 */

import type { IDependencyGraph, IDependencySpec, IResolvedPackage } from '../types.js';
import type { IQUBOBuilderInput } from '../qubo/qubo-builder.js';
import type {
  IResolverConfig,
  IResolverResult,
  IResolverProgress,
  IResolverStats,
  IViolation,
} from './types.js';
import { DEFAULT_RESOLVER_CONFIG } from './types.js';

import { QUBOBuilder } from '../qubo/qubo-builder.js';
import { SimulatedAnnealing } from '../annealing/simulated-annealing.js';
import { ParallelTempering } from '../annealing/parallel-tempering.js';
import { exponentialCooling } from '../annealing/cooling-schedules.js';

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

  constructor(config: IResolverConfig = {}) {
    this.config = {
      ...DEFAULT_RESOLVER_CONFIG,
      ...config,
    };
    this.adapter = this.createAdapter(this.config.ecosystem);
  }

  /**
   * Resolve dependencies for a manifest.
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
      this.reportProgress({ phase: 'fetching', progress: 0, message: 'Fetching package metadata...' });

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
      this.reportProgress({ phase: 'building', progress: 0, message: 'Building QUBO matrix...' });

      const builder = new QUBOBuilder({
        oneHotPenalty: 1000,
        conflictPenalty: 500,
        dependencyPenalty: 200,
      });

      const quboInput = this.graphToQUBOInput(graph);
      const problem = builder.build(quboInput);

      this.reportProgress({
        phase: 'building',
        progress: 1,
        message: `Built ${problem.matrix.size}x${problem.matrix.size} QUBO matrix`,
      });

      // Phase 3: Solve with annealing
      this.reportProgress({ phase: 'solving', progress: 0, message: 'Starting quantum-inspired optimization...' });

      const annealingResult = this.solve(problem.matrix);

      this.reportProgress({
        phase: 'solving',
        progress: 1,
        message: `Optimization complete. Energy: ${annealingResult.energy.toFixed(2)}`,
        iteration: annealingResult.iterations,
        bestEnergy: annealingResult.energy,
      });

      // Phase 4: Interpret solution
      this.reportProgress({ phase: 'interpreting', progress: 0, message: 'Interpreting solution...' });

      const { packages, violations } = this.interpretSolution(annealingResult.solution, problem, graph);

      const endTime = performance.now();

      const stats: IResolverStats = {
        totalPackages: graph.packages.size,
        totalVersions: problem.variables.length,
        matrixSize: problem.matrix.size,
        numConstraints: problem.constraints.length,
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
   * Convert an IDependencyGraph to the IQUBOBuilderInput format.
   */
  private graphToQUBOInput(graph: IDependencyGraph): IQUBOBuilderInput {
    const packageVersions = new Map<string, {
      name: string;
      versions: readonly string[];
      dependenciesByVersion: ReadonlyMap<string, readonly IDependencySpec[]>;
    }>();

    for (const [name, pkg] of graph.packages) {
      packageVersions.set(name, {
        name,
        versions: pkg.versions,
        dependenciesByVersion: pkg.dependencies,
      });
    }

    const rootDependencies: IDependencySpec[] = [];
    for (const [name, constraint] of graph.constraints) {
      rootDependencies.push({ name, constraint });
    }

    return { rootDependencies, packageVersions };
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
    const allRoots: IDependencySpec[] = [...dependencies];
    if (this.config.includeDevDeps && devDependencies) allRoots.push(...devDependencies);
    if (this.config.includeOptionalDeps && optionalDependencies) allRoots.push(...optionalDependencies);

    const queue: Array<{ spec: IDependencySpec; depth: number }> =
      allRoots.map((spec) => ({ spec, depth: 0 }));
    const visited = new Set<string>();

    const adapterOptions: IAdapterOptions = {
      ...(this.config.registryUrl && { registryUrl: this.config.registryUrl }),
      ...(this.config.authToken && { authToken: this.config.authToken }),
      ...(this.config.signal && { signal: this.config.signal }),
      cache: this.cache,
    };

    while (queue.length > 0) {
      const batch = queue.splice(0, 20);
      const toFetch = batch.filter((item) => !visited.has(item.spec.name));

      if (toFetch.length > 0) {
        const names = toFetch.map((item) => item.spec.name);
        const metadatas = await this.adapter.fetchPackages(names, adapterOptions);

        for (const item of toFetch) {
          const { spec, depth } = item;
          visited.add(spec.name);

          const metadata = metadatas.get(spec.name);
          if (!metadata) continue;

          packages.set(spec.name, metadata);

          if (depth < this.config.maxDepth) {
            for (const version of metadata.versions.slice(0, this.config.maxVersionsPerPackage)) {
              for (const dep of version.dependencies) {
                if (!visited.has(dep.name)) {
                  queue.push({ spec: dep, depth: depth + 1 });
                }
              }
            }
          }

          this.reportProgress({
            phase: 'fetching',
            progress: visited.size / (visited.size + queue.length),
            message: `Fetched ${spec.name}`,
            packagesFetched: packages.size,
          });
        }
      }
    }

    const graphPackages = new Map<string, {
      name: string;
      versions: readonly string[];
      dependencies: ReadonlyMap<string, readonly IDependencySpec[]>;
    }>();

    for (const [name, metadata] of packages) {
      const versionDeps = new Map<string, readonly IDependencySpec[]>();
      for (const version of metadata.versions.slice(0, this.config.maxVersionsPerPackage)) {
        versionDeps.set(version.version, version.dependencies);
      }
      graphPackages.set(name, {
        name,
        versions: metadata.versions.slice(0, this.config.maxVersionsPerPackage).map((v) => v.version),
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
   * Solve the QUBO problem with simulated annealing or parallel tempering.
   */
  private solve(matrix: import('../qubo/types.js').IQUBOMatrix): { solution: ReadonlyMap<number, 0 | 1>; energy: number; iterations: number } {
    if (this.config.useParallelTempering) {
      const solver = new ParallelTempering({
        numReplicas: this.config.numReplicas,
        minTemperature: this.config.finalTemperature,
        maxTemperature: this.config.initialTemperature,
        iterationsPerReplica: this.config.maxIterations,
        ...(this.config.seed !== undefined && { seed: this.config.seed }),
      });
      const result = solver.solve(matrix, { ...(this.config.signal && { signal: this.config.signal }) });
      return {
        solution: result.solution,
        energy: result.energy,
        iterations: result.totalIterations,
      };
    } else {
      const coolingSchedule = this.config.coolingSchedule ?? exponentialCooling(0.995);
      const solver = new SimulatedAnnealing({
        initialTemperature: this.config.initialTemperature,
        finalTemperature: this.config.finalTemperature,
        maxIterations: this.config.maxIterations,
        coolingSchedule,
        ...(this.config.seed !== undefined && { seed: this.config.seed }),
      });
      const result = solver.solve(matrix, {
        collectTrace: this.config.collectTrace,
        ...(this.config.signal && { signal: this.config.signal }),
      });
      return {
        solution: result.solution,
        energy: result.energy,
        iterations: result.iterations,
      };
    }
  }

  /**
   * Interpret binary solution as resolved packages.
   */
  private interpretSolution(
    solution: ReadonlyMap<number, 0 | 1>,
    problem: import('../qubo/types.js').IQUBOProblem,
    graph: IDependencyGraph
  ): { packages: IResolvedPackage[]; violations: IViolation[] } {
    const packages: IResolvedPackage[] = [];
    const violations: IViolation[] = [];
    const selectedVersions = new Map<string, string[]>();

    for (const variable of problem.variables) {
      if (solution.get(variable.id) === 1) {
        const existing = selectedVersions.get(variable.packageName) ?? [];
        existing.push(variable.version);
        selectedVersions.set(variable.packageName, existing);
      }
    }

    for (const [packageName, versions] of selectedVersions) {
      if (versions.length > 1) {
        violations.push({
          type: 'one_hot',
          packages: [packageName],
          message: `Package ${packageName} has multiple versions selected: ${versions.join(', ')}`,
          penalty: 1000,
        });
      } else if (versions.length === 1) {
        packages.push({
          name: packageName,
          version: versions[0]!,
          dependencies: this.getVersionDependencies(graph, packageName, versions[0]!),
        });
      }
    }

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

    packages.sort((a, b) => a.name.localeCompare(b.name));
    return { packages, violations };
  }

  private getVersionDependencies(
    graph: IDependencyGraph,
    packageName: string,
    version: string
  ): ReadonlyMap<string, string> {
    const pkg = graph.packages.get(packageName);
    if (!pkg) return new Map();
    const deps = pkg.dependencies.get(version);
    if (!deps) return new Map();
    return new Map(deps.map((d) => [d.name, d.constraint]));
  }

  private reportProgress(progress: IResolverProgress): void {
    this.config.onProgress?.(progress);
  }

  private createAdapter(ecosystem: string): IEcosystemAdapter {
    switch (ecosystem) {
      case 'npm': return new NpmAdapter();
      case 'pip': return new PipAdapter();
      case 'cargo': return new CargoAdapter();
      case 'maven': return new MavenAdapter();
      default: throw new Error(`Unknown ecosystem: ${ecosystem}`);
    }
  }

  public getCacheStats(): { hits: number; misses: number; size: number } {
    return this.cache.stats();
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
