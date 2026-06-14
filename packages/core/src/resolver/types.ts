/**
 * QUBO Resolver types.
 *
 * Configuration and result types for the quantum-inspired dependency resolver.
 */

import type { ICoolingSchedule, IAnnealingTrace } from '../annealing/types.js';
import type { IResolvedPackage, IDependencyGraph } from '../types.js';

/**
 * Resolver configuration options.
 */
export interface IResolverConfig {
  /**
   * Ecosystem to resolve for.
   * @default 'npm'
   */
  readonly ecosystem?: 'npm' | 'pip' | 'cargo' | 'maven' | 'hf';

  /**
   * Custom registry URL (overrides ecosystem default).
   */
  readonly registryUrl?: string;

  /**
   * Maximum depth for transitive dependencies.
   * @default 10
   */
  readonly maxDepth?: number;

  /**
   * Maximum number of versions to consider per package.
   * @default 20
   */
  readonly maxVersionsPerPackage?: number;

  /**
   * Include dev dependencies in resolution.
   * @default false
   */
  readonly includeDevDeps?: boolean;

  /**
   * Include optional dependencies in resolution.
   * @default false
   */
  readonly includeOptionalDeps?: boolean;

  /**
   * Use parallel tempering instead of simple simulated annealing.
   * @default true
   */
  readonly useParallelTempering?: boolean;

  /**
   * Number of replicas for parallel tempering.
   * @default 8
   */
  readonly numReplicas?: number;

  /**
   * Initial temperature for annealing.
   * @default 100
   */
  readonly initialTemperature?: number;

  /**
   * Final temperature for annealing.
   * @default 0.001
   */
  readonly finalTemperature?: number;

  /**
   * Maximum iterations for annealing.
   * @default 100000
   */
  readonly maxIterations?: number;

  /**
   * Cooling schedule to use.
   */
  readonly coolingSchedule?: ICoolingSchedule;

  /**
   * Maximum time in seconds for resolution.
   * @default 60
   */
  readonly maxTimeSeconds?: number;

  /**
   * Random seed for reproducible results.
   */
  readonly seed?: number;

  /**
   * Collect execution trace for visualization.
   * @default false
   */
  readonly collectTrace?: boolean;

  /**
   * Progress callback for UI updates.
   */
  readonly onProgress?: (progress: IResolverProgress) => void;

  /**
   * Abort signal for cancellation.
   */
  readonly signal?: AbortSignal;

  /**
   * Authentication token for private registries.
   */
  readonly authToken?: string;
}

/**
 * Resolver progress information.
 */
export interface IResolverProgress {
  /** Current phase */
  readonly phase: 'fetching' | 'building' | 'solving' | 'interpreting';
  /** Phase progress (0-1) */
  readonly progress: number;
  /** Current phase description */
  readonly message: string;
  /** Number of packages fetched */
  readonly packagesFetched?: number;
  /** Current iteration (during solving) */
  readonly iteration?: number;
  /** Current best energy (during solving) */
  readonly bestEnergy?: number;
  /** Current temperature (during solving) */
  readonly temperature?: number;
}

/**
 * Resolver statistics.
 */
export interface IResolverStats {
  /** Total packages considered */
  readonly totalPackages: number;
  /** Total versions considered */
  readonly totalVersions: number;
  /** QUBO matrix size */
  readonly matrixSize: number;
  /** Number of constraints encoded */
  readonly numConstraints: number;
  /** Annealing iterations performed */
  readonly iterations: number;
  /** Final energy value */
  readonly finalEnergy: number;
  /** Number of constraint violations */
  readonly violations: number;
  /** Resolution time in ms */
  readonly timeMs: number;
  /** Cache hit rate */
  readonly cacheHitRate?: number;
}

/**
 * Constraint violation details.
 */
export interface IViolation {
  /** Violation type */
  readonly type: 'one_hot' | 'dependency' | 'conflict' | 'constraint';
  /** Affected packages */
  readonly packages: readonly string[];
  /** Violation description */
  readonly message: string;
  /** Penalty weight of this violation */
  readonly penalty: number;
}

/**
 * QUBO resolution result.
 */
export interface IResolverResult {
  /** Whether resolution succeeded */
  readonly success: boolean;
  /** Resolved packages (empty if failed) */
  readonly packages: readonly IResolvedPackage[];
  /** Constraint violations (should be empty for success) */
  readonly violations: readonly IViolation[];
  /** Resolution statistics */
  readonly stats: IResolverStats;
  /** Execution trace (if collectTrace enabled) */
  readonly trace?: IAnnealingTrace;
  /** Error message (if failed) */
  readonly error?: string;
  /** The dependency graph that was resolved */
  readonly graph?: IDependencyGraph;
}

/**
 * Default resolver configuration.
 */
export const DEFAULT_RESOLVER_CONFIG: Required<Omit<
  IResolverConfig,
  'registryUrl' | 'coolingSchedule' | 'onProgress' | 'signal' | 'authToken' | 'seed'
>> = {
  ecosystem: 'npm',
  maxDepth: 10,
  maxVersionsPerPackage: 20,
  includeDevDeps: false,
  includeOptionalDeps: false,
  useParallelTempering: true,
  numReplicas: 8,
  initialTemperature: 100,
  finalTemperature: 0.001,
  maxIterations: 100000,
  maxTimeSeconds: 60,
  collectTrace: false,
};
