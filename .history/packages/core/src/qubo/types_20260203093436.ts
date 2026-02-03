/**
 * QUBO (Quadratic Unconstrained Binary Optimization) types.
 *
 * The QUBO formulation transforms dependency resolution into:
 *   minimize H(σ) = Σᵢⱼ Jᵢⱼσᵢσⱼ + Σᵢ hᵢσᵢ
 *
 * Where σᵢ ∈ {0, 1} represents binary decisions (select version or not).
 */

/**
 * A variable in the QUBO problem.
 * Each variable represents a binary decision: "include this version or not".
 */
export interface IQUBOVariable {
  /** Unique variable ID (index in the problem) */
  readonly id: number;
  /** Package name this variable represents */
  readonly packageName: string;
  /** Version this variable represents */
  readonly version: string;
  /** Linear bias term (hᵢ) - preference for selecting this variable */
  readonly bias: number;
  /** Human-readable label */
  readonly label: string;
}

/**
 * Sparse representation of the QUBO matrix.
 * Only non-zero entries are stored.
 */
export interface IQUBOMatrix {
  /** Number of variables */
  readonly size: number;
  /** Linear terms (diagonal): hᵢ */
  readonly linear: ReadonlyMap<number, number>;
  /** Quadratic terms (off-diagonal): Jᵢⱼ */
  readonly quadratic: ReadonlyMap<string, number>;
}

/**
 * A constraint in the QUBO formulation.
 */
export interface IQUBOConstraint {
  /** Constraint type */
  readonly type: QUBOConstraintType;
  /** Variables involved */
  readonly variables: readonly number[];
  /** Penalty weight for violating this constraint */
  readonly penalty: number;
  /** Human-readable description */
  readonly description: string;
}

/**
 * Types of constraints that can be encoded.
 */
export enum QUBOConstraintType {
  /** Exactly one variable must be 1 (one-hot) */
  EXACTLY_ONE = 'EXACTLY_ONE',
  /** At most one variable can be 1 */
  AT_MOST_ONE = 'AT_MOST_ONE',
  /** At least one variable must be 1 */
  AT_LEAST_ONE = 'AT_LEAST_ONE',
  /** If A is selected, B must also be selected */
  IMPLICATION = 'IMPLICATION',
  /** A and B cannot both be selected */
  CONFLICT = 'CONFLICT',
  /** A and B must have the same value */
  EQUALITY = 'EQUALITY',
}

/**
 * A complete QUBO problem instance.
 */
export interface IQUBOProblem {
  /** All variables in the problem */
  readonly variables: readonly IQUBOVariable[];
  /** The QUBO matrix (sparse representation) */
  readonly matrix: IQUBOMatrix;
  /** All constraints */
  readonly constraints: readonly IQUBOConstraint[];
  /** Variable lookup by package and version */
  readonly variableIndex: ReadonlyMap<string, number>;
  /** Problem statistics */
  readonly stats: IQUBOStats;
}

/**
 * Statistics about a QUBO problem.
 */
export interface IQUBOStats {
  /** Total number of variables */
  readonly variableCount: number;
  /** Number of non-zero linear terms */
  readonly linearTerms: number;
  /** Number of non-zero quadratic terms */
  readonly quadraticTerms: number;
  /** Number of constraints */
  readonly constraintCount: number;
  /** Estimated problem density */
  readonly density: number;
  /** Number of packages */
  readonly packageCount: number;
  /** Average versions per package */
  readonly avgVersionsPerPackage: number;
}

/**
 * A binary solution to the QUBO problem.
 */
export interface IQUBOSolution {
  /** Binary assignment: variable ID → 0 or 1 */
  readonly assignment: ReadonlyMap<number, 0 | 1>;
  /** Energy of this solution */
  readonly energy: number;
  /** Whether all constraints are satisfied */
  readonly feasible: boolean;
  /** Number of violated constraints */
  readonly violations: number;
}

/**
 * Configuration for QUBO construction.
 */
export interface IQUBOConfig {
  /** Penalty for violating one-hot constraints (exactly one version per package) */
  readonly oneHotPenalty: number;
  /** Penalty for version conflicts */
  readonly conflictPenalty: number;
  /** Penalty for missing dependencies */
  readonly dependencyPenalty: number;
  /** Bonus for newer versions (recency preference) */
  readonly recencyBonus: number;
  /** Bonus for popular versions (download count) */
  readonly popularityBonus: number;
  /** Weight for minimizing total packages */
  readonly minimalityWeight: number;
}

/**
 * Default QUBO configuration.
 */
export const DEFAULT_QUBO_CONFIG: IQUBOConfig = {
  oneHotPenalty: 1000,
  conflictPenalty: 500,
  dependencyPenalty: 200,
  recencyBonus: 0.1,
  popularityBonus: 0.05,
  minimalityWeight: 0.01,
};

/**
 * Creates a key for quadratic term storage.
 */
export function quadraticKey(i: number, j: number): string {
  // Ensure i < j for consistent storage
  return i < j ? `${i},${j}` : `${j},${i}`;
}

/**
 * Parses a quadratic key back to indices.
 */
export function parseQuadraticKey(key: string): [number, number] {
  const [i, j] = key.split(',').map(Number);
  return [i!, j!];
}
