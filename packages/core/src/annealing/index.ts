/**
 * Annealing module exports.
 */

export { SimulatedAnnealing } from './simulated-annealing.js';
export type { AnnealingProgressCallback, IAnnealingOptions } from './simulated-annealing.js';

export { ParallelTempering } from './parallel-tempering.js';
export type {
  IParallelTemperingOptions,
  ParallelTemperingProgressCallback,
} from './parallel-tempering.js';

export {
  adaptiveCooling,
  boltzmannCooling,
  cauchyCooling,
  customCooling,
  exponentialCooling,
  geometricWithReheat,
  linearCooling,
  logarithmicCooling,
  stepCooling,
} from './cooling-schedules.js';

export { DEFAULT_ANNEALING_CONFIG, DEFAULT_PARALLEL_TEMPERING_CONFIG } from './types.js';

export type {
  IAnnealingConfig,
  IAnnealingResult,
  IAnnealingState,
  IAnnealingStats,
  IAnnealingTrace,
  ICoolingSchedule,
  IParallelTemperingConfig,
  IParallelTemperingResult,
  IReplicaStats,
} from './types.js';
