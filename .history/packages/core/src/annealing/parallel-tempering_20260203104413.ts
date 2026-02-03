/**
 * Parallel Tempering (Replica Exchange Monte Carlo).
 *
 * Parallel tempering runs multiple copies (replicas) of the system at
 * different temperatures simultaneously. Periodically, neighboring replicas
 * attempt to exchange configurations, allowing:
 *
 * - Hot replicas to explore broadly and find new basins
 * - Cold replicas to refine solutions in promising regions
 * - Information flow between temperature levels
 *
 * This overcomes the main weakness of simulated annealing: being trapped
 * in local minima. Parallel tempering provides a "ladder" for configurations
 * to climb to high temperatures, explore, and descend to new regions.
 *
 * Exchange acceptance follows detailed balance:
 *   P(exchange) = min(1, exp(ΔβΔE))
 *   where Δβ = 1/T_i - 1/T_j and ΔE = E_i - E_j
 */

import { Hamiltonian } from '../qubo/hamiltonian.js';
import type { IQUBOMatrix } from '../qubo/types.js';
import type { IParallelTemperingConfig, IParallelTemperingResult, IReplicaStats } from './types.js';
import { DEFAULT_PARALLEL_TEMPERING_CONFIG } from './types.js';

/**
 * Replica state for parallel tempering.
 */
interface IReplica {
  index: number;
  temperature: number;
  solution: Map<number, 0 | 1>;
  energy: number;
  acceptedMoves: number;
  rejectedMoves: number;
  exchangesUp: number;
  exchangesDown: number;
}

/**
 * Progress callback for parallel tempering.
 */
export type ParallelTemperingProgressCallback = (info: {
  iteration: number;
  bestEnergy: number;
  replicaEnergies: readonly number[];
  exchangeCount: number;
  elapsedMs: number;
}) => void;

/**
 * Options for parallel tempering.
 */
export interface IParallelTemperingOptions {
  /** Progress callback */
  readonly onProgress?: ParallelTemperingProgressCallback;
  /** Progress callback interval */
  readonly progressInterval?: number;
  /** Initial solutions for replicas (random if not provided) */
  readonly initialSolutions?: ReadonlyMap<number, 0 | 1>[];
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Parallel Tempering optimizer for QUBO problems.
 */
export class ParallelTempering {
  private readonly config: IParallelTemperingConfig;
  private readonly rng: () => number;

  constructor(config: Partial<IParallelTemperingConfig> = {}) {
    this.config = { ...DEFAULT_PARALLEL_TEMPERING_CONFIG, ...config };

    if (this.config.seed !== undefined) {
      this.rng = this.createSeededRng(this.config.seed);
    } else {
      this.rng = Math.random;
    }
  }

  /**
   * Run parallel tempering on a QUBO problem.
   *
   * @param matrix - The QUBO matrix to optimize
   * @param options - Optional settings
   * @returns The optimization result
   */
  public solve(
    matrix: IQUBOMatrix,
    options: IParallelTemperingOptions = {}
  ): IParallelTemperingResult {
    const startTime = performance.now();
    const hamiltonian = new Hamiltonian(matrix);

    // Initialize replicas with temperature ladder
    const temperatures = this.generateTemperatureLadder();
    const replicas = this.initializeReplicas(temperatures, hamiltonian, options.initialSolutions);

    // Track best solution across all replicas
    let bestSolution = hamiltonian.cloneSolution(replicas[0]!.solution);
    let bestEnergy = replicas[0]!.energy;

    for (const replica of replicas) {
      if (replica.energy < bestEnergy) {
        bestSolution = hamiltonian.cloneSolution(replica.solution);
        bestEnergy = replica.energy;
      }
    }

    let exchangeCount = 0;
    const progressInterval = options.progressInterval ?? 100;

    // Main parallel tempering loop
    for (let iteration = 0; iteration < this.config.iterationsPerReplica; iteration++) {
      // Check for cancellation
      if (options.signal?.aborted) {
        break;
      }

      // Check time limit
      if (this.config.maxTimeSeconds !== undefined) {
        const elapsedMs = performance.now() - startTime;
        if (elapsedMs > this.config.maxTimeSeconds * 1000) {
          break;
        }
      }

      // Perform local moves on each replica
      for (const replica of replicas) {
        this.localMove(replica, hamiltonian);

        // Update global best
        if (replica.energy < bestEnergy) {
          bestSolution = hamiltonian.cloneSolution(replica.solution);
          bestEnergy = replica.energy;
        }
      }

      // Attempt replica exchanges
      if (iteration % this.config.exchangeInterval === 0 && iteration > 0) {
        exchangeCount += this.attemptExchanges(replicas);
      }

      // Progress reporting
      if (iteration % progressInterval === 0 && options.onProgress) {
        options.onProgress({
          iteration,
          bestEnergy,
          replicaEnergies: replicas.map((r) => r.energy),
          exchangeCount,
          elapsedMs: performance.now() - startTime,
        });
      }
    }

    const endTime = performance.now();
    const timeMs = endTime - startTime;

    // Compile statistics
    const replicaStats: IReplicaStats[] = replicas.map((r) => ({
      index: r.index,
      temperature: r.temperature,
      finalEnergy: r.energy,
      acceptanceRate:
        r.acceptedMoves + r.rejectedMoves > 0
          ? r.acceptedMoves / (r.acceptedMoves + r.rejectedMoves)
          : 0,
      exchangesUp: r.exchangesUp,
      exchangesDown: r.exchangesDown,
    }));

    return {
      solution: bestSolution,
      energy: bestEnergy,
      replicaEnergies: replicas.map((r) => r.energy),
      exchangeCount,
      totalIterations: this.config.iterationsPerReplica * replicas.length,
      timeMs,
      replicaStats,
    };
  }

  /**
   * Generate temperature ladder.
   */
  private generateTemperatureLadder(): number[] {
    const { numReplicas, minTemperature, maxTemperature, temperatureDistribution } = this.config;

    const temperatures: number[] = [];

    if (temperatureDistribution === 'geometric') {
      // Geometric spacing: T_i = T_min * (T_max/T_min)^(i/(n-1))
      const ratio = maxTemperature / minTemperature;
      for (let i = 0; i < numReplicas; i++) {
        const exponent = i / (numReplicas - 1);
        temperatures.push(minTemperature * Math.pow(ratio, exponent));
      }
    } else {
      // Linear spacing
      const step = (maxTemperature - minTemperature) / (numReplicas - 1);
      for (let i = 0; i < numReplicas; i++) {
        temperatures.push(minTemperature + i * step);
      }
    }

    return temperatures;
  }

  /**
   * Initialize all replicas.
   */
  private initializeReplicas(
    temperatures: number[],
    hamiltonian: Hamiltonian,
    initialSolutions?: ReadonlyMap<number, 0 | 1>[]
  ): IReplica[] {
    return temperatures.map((temp, index) => {
      const solution = initialSolutions?.[index]
        ? new Map(initialSolutions[index])
        : hamiltonian.randomSolution(this.rng);

      return {
        index,
        temperature: temp,
        solution,
        energy: hamiltonian.energy(solution),
        acceptedMoves: 0,
        rejectedMoves: 0,
        exchangesUp: 0,
        exchangesDown: 0,
      };
    });
  }

  /**
   * Perform a local Metropolis move on a replica.
   */
  private localMove(replica: IReplica, hamiltonian: Hamiltonian): void {
    // Select random variable
    const variable = Math.floor(this.rng() * hamiltonian.variableCount);

    // Calculate energy change
    const deltaE = hamiltonian.energyDelta(replica.solution, variable);

    // Metropolis acceptance
    const accept = deltaE < 0 || this.rng() < Math.exp(-deltaE / replica.temperature);

    if (accept) {
      hamiltonian.flipVariable(replica.solution, variable);
      replica.energy += deltaE;
      replica.acceptedMoves++;
    } else {
      replica.rejectedMoves++;
    }
  }

  /**
   * Attempt exchanges between adjacent replicas.
   *
   * Uses even-odd scheme: first exchange (0,1), (2,3), ...
   * then exchange (1,2), (3,4), ...
   *
   * Returns number of successful exchanges.
   */
  private attemptExchanges(replicas: IReplica[]): number {
    let exchanges = 0;

    // Randomly choose even-odd or odd-even pairs
    const startOffset = this.rng() < 0.5 ? 0 : 1;

    for (let i = startOffset; i < replicas.length - 1; i += 2) {
      const r1 = replicas[i]!;
      const r2 = replicas[i + 1]!;

      // Exchange acceptance probability
      // P = min(1, exp((β1 - β2)(E1 - E2)))
      // where β = 1/T
      const deltaBeta = 1 / r1.temperature - 1 / r2.temperature;
      const deltaE = r1.energy - r2.energy;
      const logProb = deltaBeta * deltaE;

      const accept = logProb > 0 || this.rng() < Math.exp(logProb);

      if (accept) {
        // Swap solutions and energies
        const tempSolution = r1.solution;
        const tempEnergy = r1.energy;

        r1.solution = r2.solution;
        r1.energy = r2.energy;
        r2.solution = tempSolution;
        r2.energy = tempEnergy;

        // Track exchange statistics
        r1.exchangesDown++;
        r2.exchangesUp++;
        exchanges++;
      }
    }

    return exchanges;
  }

  /**
   * Create a seeded pseudo-random number generator.
   */
  private createSeededRng(seed: number): () => number {
    let s0 = seed >>> 0;
    let s1 = (seed * 1664525 + 1013904223) >>> 0;

    return () => {
      let t = s0;
      const s = s1;
      s0 = s;
      t ^= t << 23;
      t ^= t >>> 18;
      t ^= s ^ (s >>> 5);
      s1 = t;
      return (s0 + s1) / 4294967296;
    };
  }

  /**
   * Estimate optimal temperature ladder spacing.
   *
   * For good exchange rates, adjacent temperatures should have
   * significant overlap in their energy distributions.
   * Rule of thumb: acceptance rate ~20-30% between adjacent replicas.
   *
   * @param matrix - QUBO matrix
   * @param targetExchangeRate - Target exchange acceptance rate
   * @param samples - Number of samples for estimation
   */
  public static estimateOptimalSpacing(
    matrix: IQUBOMatrix,
    targetExchangeRate = 0.25,
    samples = 1000
  ): { minTemp: number; maxTemp: number; numReplicas: number } {
    const hamiltonian = new Hamiltonian(matrix);
    const n = hamiltonian.variableCount;

    // Estimate energy variance at high temperature (random solutions)
    let energySum = 0;
    let energySumSq = 0;

    for (let i = 0; i < samples; i++) {
      const solution = hamiltonian.randomSolution();
      const e = hamiltonian.energy(solution);
      energySum += e;
      energySumSq += e * e;
    }

    const meanEnergy = energySum / samples;
    const variance = energySumSq / samples - meanEnergy * meanEnergy;
    const stdDev = Math.sqrt(variance);

    // Estimate temperature range
    // Max temp: random walk regime (most moves accepted)
    // Min temp: quench regime (only improving moves)
    const maxTemp = stdDev / Math.sqrt(n);
    const minTemp = 0.01;

    // Estimate number of replicas for target exchange rate
    // Optimal spacing: T_{i+1}/T_i ≈ 1 + sqrt(2/(n * C_v))
    // where C_v is specific heat. For rough estimate, use 1.1-1.3 ratio.
    const tempRatio = 1.2;
    const numReplicas = Math.ceil(Math.log(maxTemp / minTemp) / Math.log(tempRatio));

    return { minTemp, maxTemp, numReplicas: Math.max(4, numReplicas) };
  }
}
