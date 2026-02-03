/**
 * Annealing algorithm types.
 */

/**
 * Configuration for simulated annealing.
 */
export interface IAnnealingConfig {
  /** Initial temperature (default: 100) */
  readonly initialTemperature: number;
  /** Final temperature threshold (default: 0.001) */
  readonly finalTemperature: number;
  /** Maximum iterations (default: 100000) */
  readonly maxIterations: number;
  /** Cooling schedule function */
  readonly coolingSchedule: ICoolingSchedule;
  /** Number of iterations at each temperature (Markov chain length) */
  readonly iterationsPerTemperature: number;
  /** Random seed for reproducibility (optional) */
  readonly seed?: number;
  /** Whether to restart from best if stuck */
  readonly enableRestarts: boolean;
  /** Iterations without improvement before restart */
  readonly restartThreshold: number;
}

/**
 * Cooling schedule function.
 *
 * Takes the current temperature and returns the next temperature.
 */
export type ICoolingSchedule = (
  currentTemp: number,
  iteration: number,
  config: IAnnealingConfig
) => number;

/**
 * State of the annealing process.
 */
export interface IAnnealingState {
  /** Current temperature */
  readonly temperature: number;
  /** Current iteration */
  readonly iteration: number;
  /** Current solution (binary assignment) */
  readonly solution: ReadonlyMap<number, 0 | 1>;
  /** Current energy */
  readonly energy: number;
  /** Best solution found so far */
  readonly bestSolution: ReadonlyMap<number, 0 | 1>;
  /** Best energy found so far */
  readonly bestEnergy: number;
  /** Number of accepted moves */
  readonly acceptedMoves: number;
  /** Number of rejected moves */
  readonly rejectedMoves: number;
  /** Acceptance rate (0-1) */
  readonly acceptanceRate: number;
}

/**
 * Result of an annealing run.
 */
export interface IAnnealingResult {
  /** Final solution */
  readonly solution: ReadonlyMap<number, 0 | 1>;
  /** Final energy */
  readonly energy: number;
  /** Whether the algorithm converged */
  readonly converged: boolean;
  /** Total iterations performed */
  readonly iterations: number;
  /** Final temperature */
  readonly finalTemperature: number;
  /** Time taken in milliseconds */
  readonly timeMs: number;
  /** Trace of the optimization (if requested) */
  readonly trace?: IAnnealingTrace;
  /** Statistics about the run */
  readonly stats: IAnnealingStats;
}

/**
 * Trace of the annealing process for visualization/debugging.
 */
export interface IAnnealingTrace {
  /** Temperatures at each checkpoint */
  readonly temperatures: readonly number[];
  /** Energies at each checkpoint */
  readonly energies: readonly number[];
  /** Best energies at each checkpoint */
  readonly bestEnergies: readonly number[];
  /** Acceptance rates at each checkpoint */
  readonly acceptanceRates: readonly number[];
  /** Iteration numbers for checkpoints */
  readonly iterations: readonly number[];
}

/**
 * Statistics about an annealing run.
 */
export interface IAnnealingStats {
  /** Total accepted moves */
  readonly totalAccepted: number;
  /** Total rejected moves */
  readonly totalRejected: number;
  /** Number of restarts */
  readonly restarts: number;
  /** Time per iteration (microseconds) */
  readonly usPerIteration: number;
  /** Initial energy */
  readonly initialEnergy: number;
  /** Final improvement ratio */
  readonly improvementRatio: number;
}

/**
 * Configuration for parallel tempering.
 */
export interface IParallelTemperingConfig {
  /** Number of replicas (temperatures) */
  readonly numReplicas: number;
  /** Minimum temperature */
  readonly minTemperature: number;
  /** Maximum temperature */
  readonly maxTemperature: number;
  /** Temperature distribution ('geometric' | 'linear') */
  readonly temperatureDistribution: 'geometric' | 'linear';
  /** Iterations between replica exchange attempts */
  readonly exchangeInterval: number;
  /** Total iterations per replica */
  readonly iterationsPerReplica: number;
  /** Maximum wall-clock time in seconds (optional) */
  readonly maxTimeSeconds?: number;
  /** Random seed for reproducibility (optional) */
  readonly seed?: number;
}

/**
 * Result of parallel tempering.
 */
export interface IParallelTemperingResult {
  /** Best solution found across all replicas */
  readonly solution: ReadonlyMap<number, 0 | 1>;
  /** Best energy found */
  readonly energy: number;
  /** Final energies of each replica */
  readonly replicaEnergies: readonly number[];
  /** Number of successful exchanges */
  readonly exchangeCount: number;
  /** Total iterations across all replicas */
  readonly totalIterations: number;
  /** Time taken in milliseconds */
  readonly timeMs: number;
  /** Per-replica statistics */
  readonly replicaStats: readonly IReplicaStats[];
}

/**
 * Statistics for a single replica in parallel tempering.
 */
export interface IReplicaStats {
  /** Replica index */
  readonly index: number;
  /** Assigned temperature */
  readonly temperature: number;
  /** Final energy */
  readonly finalEnergy: number;
  /** Acceptance rate */
  readonly acceptanceRate: number;
  /** Number of exchanges with higher-temperature replica */
  readonly exchangesUp: number;
  /** Number of exchanges with lower-temperature replica */
  readonly exchangesDown: number;
}

/**
 * Default annealing configuration.
 */
export const DEFAULT_ANNEALING_CONFIG: IAnnealingConfig = {
  initialTemperature: 100,
  finalTemperature: 0.001,
  maxIterations: 100000,
  coolingSchedule: (temp, _, config) =>
    temp * 0.995, // Exponential by default
  iterationsPerTemperature: 100,
  enableRestarts: true,
  restartThreshold: 5000,
};

/**
 * Default parallel tempering configuration.
 */
export const DEFAULT_PARALLEL_TEMPERING_CONFIG: IParallelTemperingConfig = {
  numReplicas: 8,
  minTemperature: 0.01,
  maxTemperature: 100,
  temperatureDistribution: 'geometric',
  exchangeInterval: 100,
  iterationsPerReplica: 10000,
};
