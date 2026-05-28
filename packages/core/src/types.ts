/**
 * Core types for QADR dependency resolution.
 */

/**
 * A dependency specification as found in package manifests.
 */
export interface IDependencySpec {
  /** Package name */
  readonly name: string;
  /** Version constraint (e.g., "^4.17.0", ">=1.0.0 <2.0.0") */
  readonly constraint: string;
  /** Whether this is a dev/test dependency */
  readonly isDev?: boolean;
  /** Whether this is an optional dependency */
  readonly isOptional?: boolean;
  /** Peer dependency */
  readonly isPeer?: boolean;
}

/**
 * A resolved package with exact version.
 */
export interface IResolvedPackage {
  /** Package name */
  readonly name: string;
  /** Exact resolved version */
  readonly version: string;
  /** Integrity hash (e.g., sha512) */
  readonly integrity?: string;
  /** Resolved tarball URL or registry path */
  readonly resolved?: string;
  /** Dependencies of this package */
  readonly dependencies: ReadonlyMap<string, string>;
  /** Dev dependencies (if applicable) */
  readonly devDependencies?: ReadonlyMap<string, string>;
  /** Peer dependencies (if applicable) */
  readonly peerDependencies?: ReadonlyMap<string, string>;
}

/**
 * Represents a conflict between two package versions.
 */
export interface IConflict {
  /** First package in conflict */
  readonly packageA: string;
  /** Version of first package */
  readonly versionA: string;
  /** Second package in conflict */
  readonly packageB: string;
  /** Version of second package */
  readonly versionB: string;
  /** Human-readable description of the conflict */
  readonly reason: string;
  /** Conflict severity (higher = worse) */
  readonly severity: number;
}

/**
 * A complete solution to the dependency resolution problem.
 */
export interface ISolution {
  /** Map of package name to resolved version */
  readonly packages: ReadonlyMap<string, IResolvedPackage>;
  /** Whether the solution satisfies all constraints */
  readonly isValid: boolean;
  /** Energy of the solution (lower = better) */
  readonly energy: number;
  /** Any remaining conflicts */
  readonly conflicts: readonly IConflict[];
  /** Solution metadata */
  readonly metadata: ISolutionMetadata;
}

/**
 * Metadata about a solution.
 */
export interface ISolutionMetadata {
  /** Total number of packages */
  readonly packageCount: number;
  /** Total number of versions considered */
  readonly versionsConsidered: number;
  /** Number of constraints evaluated */
  readonly constraintsEvaluated: number;
  /** Time to reach this solution (ms) */
  readonly solveTimeMs: number;
  /** Number of annealing iterations */
  readonly iterations: number;
  /** Final temperature */
  readonly finalTemperature: number;
}

/**
 * Dependency graph node.
 */
export interface IDependencyNode {
  /** Package name */
  readonly name: string;
  /** Available versions */
  readonly versions: readonly string[];
  /** Dependencies per version */
  readonly dependenciesByVersion: ReadonlyMap<string, readonly IDependencySpec[]>;
}

/**
 * Dependency graph: all packages and their version/dependency information.
 */
export interface IDependencyGraph {
  /** All packages in the graph */
  readonly packages: ReadonlyMap<string, {
    readonly name: string;
    readonly versions: readonly string[];
    readonly dependencies: ReadonlyMap<string, readonly IDependencySpec[]>;
  }>;
  /** Root-level packages (direct dependencies of the project) */
  readonly roots: ReadonlySet<string>;
  /** Version constraints for root packages */
  readonly constraints: ReadonlyMap<string, string>;
}

/**
 * Progress callback for long-running operations.
 */
export type ProgressCallback = (progress: IProgressInfo) => void;

/**
 * Progress information.
 */
export interface IProgressInfo {
  /** Current phase */
  readonly phase: 'fetching' | 'building' | 'annealing' | 'validating';
  /** Progress percentage (0-100) */
  readonly percentage: number;
  /** Current operation description */
  readonly message: string;
  /** Current iteration (if applicable) */
  readonly iteration?: number;
  /** Current temperature (if annealing) */
  readonly temperature?: number;
  /** Current energy (if annealing) */
  readonly energy?: number;
}
