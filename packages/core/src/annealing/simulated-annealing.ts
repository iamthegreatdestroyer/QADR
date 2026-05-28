/**
 * Simulated Annealing - Metropolis-Hastings optimization.
 *
 * Simulated annealing mimics the physical process of heating a material
 * and then slowly cooling it to decrease defects. In optimization:
 *
 * 1. Start at high temperature (accept many moves, explore broadly)
 * 2. Gradually cool (accept fewer bad moves, exploit good regions)
 * 3. End at low temperature (greedy descent to local minimum)
 *
 * The acceptance probability for a move that increases energy by ΔE is:
 *   P(accept) = exp(-ΔE / T)
 *
 * This allows escaping local minima with probability that decreases as
 * temperature drops.
 */

import { Hamiltonian } from '../qubo/hamiltonian.js';
import type { IQUBOMatrix } from '../qubo/types.js';
import type {
  IAnnealingConfig,
  IAnnealingResult,
  IAnnealingState,
  IAnnealingStats,
} from './types.js';
import { DEFAULT_ANNEALING_CONFIG } from './types.js';

/**
 * Callback for progress reporting.
 */
export type AnnealingProgressCallback = (state: IAnnealingState) => void;

/**
 * Options for the annealing run.
 */
export interface IAnnealingOptions {
  /** Progress callback (called periodically) */
  readonly onProgress?: AnnealingProgressCallback;
  /** How often to call progress callback (iterations) */
  readonly progressInterval?: number;
  /** Whether to collect trace data */
  readonly collectTrace?: boolean;
  /** Initial solution (random if not provided) */
  readonly initialSolution?: ReadonlyMap<number, 0 | 1>;
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Simulated Annealing optimizer for QUBO problems.
 */
export class SimulatedAnnealing {
  private readonly config: IAnnealingConfig;
  private readonly rng: () => number;

  constructor(config: Partial<IAnnealingConfig> = {}) {
    this.config = { ...DEFAULT_ANNEALING_CONFIG, ...config };

    // Use seeded RNG if seed provided, otherwise Math.random
    if (this.config.seed !== undefined) {
      this.rng = this.createSeededRng(this.config.seed);
    } else {
      this.rng = Math.random;
    }
  }

  /**
   * Run simulated annealing on a QUBO problem.
   *
   * @param matrix - The QUBO matrix to optimize
   * @param options - Optional settings for the run
   * @returns The optimization result
   */
  public solve(matrix: IQUBOMatrix, options: IAnnealingOptions = {}): IAnnealingResult {
    const startTime = performance.now();
    const hamiltonian = new Hamiltonian(matrix);

    // Initialize solution
    let current = options.initialSolution
      ? new Map(options.initialSolution)
      : hamiltonian.randomSolution(this.rng);

    let currentEnergy = hamiltonian.energy(current);
    let best = hamiltonian.cloneSolution(current);
    let bestEnergy = currentEnergy;
    const initialEnergy = currentEnergy;

    // State tracking
    let temperature = this.config.initialTemperature;
    let acceptedMoves = 0;
    let rejectedMoves = 0;
    let restarts = 0;
    let iterationsSinceImprovement = 0;

    // Trace collection
    const trace: {
      temperatures: number[];
      energies: number[];
      bestEnergies: number[];
      acceptanceRates: number[];
      iterations: number[];
    } = {
      temperatures: [],
      energies: [],
      bestEnergies: [],
      acceptanceRates: [],
      iterations: [],
    };

    const collectTrace = options.collectTrace ?? false;
    const progressInterval = options.progressInterval ?? 1000;

    // Main annealing loop
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      // Check for cancellation
      if (options.signal?.aborted) {
        break;
      }

      // Check temperature convergence
      if (temperature < this.config.finalTemperature) {
        break;
      }

      // Perform moves at this temperature
      for (let step = 0; step < this.config.iterationsPerTemperature; step++) {
        // Select random variable to flip
        const variable = Math.floor(this.rng() * hamiltonian.variableCount);

        // Calculate energy change
        const deltaE = hamiltonian.energyDelta(current, variable);

        // Metropolis acceptance criterion
        const accept = deltaE < 0 || this.rng() < Math.exp(-deltaE / temperature);

        if (accept) {
          hamiltonian.flipVariable(current, variable);
          currentEnergy += deltaE;
          acceptedMoves++;

          // Update best if improved
          if (currentEnergy < bestEnergy) {
            best = hamiltonian.cloneSolution(current);
            bestEnergy = currentEnergy;
            iterationsSinceImprovement = 0;
          }
        } else {
          rejectedMoves++;
        }
      }

      iterationsSinceImprovement++;

      // Restart if stuck
      if (this.config.enableRestarts && iterationsSinceImprovement > this.config.restartThreshold) {
        current = hamiltonian.cloneSolution(best);
        currentEnergy = bestEnergy;
        temperature = this.config.initialTemperature * 0.5; // Partial reheat
        iterationsSinceImprovement = 0;
        restarts++;
      }

      // Cool down
      temperature = this.config.coolingSchedule(temperature, iteration, this.config);

      // Progress reporting and trace collection
      if (iteration % progressInterval === 0) {
        const acceptanceRate =
          acceptedMoves + rejectedMoves > 0 ? acceptedMoves / (acceptedMoves + rejectedMoves) : 0;

        if (collectTrace) {
          trace.temperatures.push(temperature);
          trace.energies.push(currentEnergy);
          trace.bestEnergies.push(bestEnergy);
          trace.acceptanceRates.push(acceptanceRate);
          trace.iterations.push(iteration);
        }

        if (options.onProgress) {
          options.onProgress({
            temperature,
            iteration,
            solution: current,
            energy: currentEnergy,
            bestSolution: best,
            bestEnergy,
            acceptedMoves,
            rejectedMoves,
            acceptanceRate,
          });
        }
      }
    }

    const endTime = performance.now();
    const timeMs = endTime - startTime;

    const totalMoves = acceptedMoves + rejectedMoves;
    const stats: IAnnealingStats = {
      totalAccepted: acceptedMoves,
      totalRejected: rejectedMoves,
      restarts,
      usPerIteration: totalMoves > 0 ? (timeMs * 1000) / totalMoves : 0,
      initialEnergy,
      improvementRatio:
        initialEnergy !== 0 ? (initialEnergy - bestEnergy) / Math.abs(initialEnergy) : 0,
    };

    return {
      solution: best,
      energy: bestEnergy,
      converged: temperature <= this.config.finalTemperature,
      iterations: Math.ceil(totalMoves / this.config.iterationsPerTemperature),
      finalTemperature: temperature,
      timeMs,
      ...(collectTrace && { trace }),
      stats,
    };
  }

  /**
   * Create a seeded pseudo-random number generator.
   * Uses a simple xorshift128+ algorithm.
   */
  private createSeededRng(seed: number): () => number {
    let s0 = seed >>> 0;
    let s1 = (seed * 1664525 + 1013904223) >>> 0;

    return () => {
      // xorshift128+
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
   * Estimate initial temperature using the rule of thumb that
   * ~80% of moves should be accepted initially.
   */
  public static estimateInitialTemperature(matrix: IQUBOMatrix, samples = 1000): number {
    const hamiltonian = new Hamiltonian(matrix);
    const solution = hamiltonian.randomSolution();

    let totalPositiveDelta = 0;
    let positiveCount = 0;

    for (let i = 0; i < samples; i++) {
      const variable = Math.floor(Math.random() * hamiltonian.variableCount);
      const delta = hamiltonian.energyDelta(solution, variable);

      if (delta > 0) {
        totalPositiveDelta += delta;
        positiveCount++;
      }
    }

    if (positiveCount === 0) {
      return 1; // Already at minimum
    }

    const avgPositiveDelta = totalPositiveDelta / positiveCount;

    // T such that exp(-avgDelta/T) = 0.8
    // -avgDelta/T = ln(0.8)
    // T = -avgDelta / ln(0.8)
    return -avgPositiveDelta / Math.log(0.8);
  }
}
