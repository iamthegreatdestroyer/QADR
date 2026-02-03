/**
 * Annealing module exports.
 */

export { SimulatedAnnealing } from './simulated-annealing.js';
export type {
  AnnealingProgressCallback,
  IAnnealingOptions,
} from './simulated-annealing.js';

export { ParallelTempering } from './parallel-tempering.js';
export type {
  ParallelTemperingProgressCallback,
  IParallelTemperingOptions,
} from './parallel-tempering.js';

export {
  exponentialCooling,
  linearCooling,
  logarithmicCooling,
  adaptiveCooling,
  stepCooling,
  cauchyCooling,
  boltzmannCooling,
  geometricWithReheat,
  customCooling,
} from './cooling-schedules.js';

export {
  DEFAULT_ANNEALING_CONFIG,
  DEFAULT_PARALLEL_TEMPERING_CONFIG,
} from './types.js';

export type {
  IAnnealingConfig,
  IAnnealingState,
  IAnnealingResult,
  IAnnealingStats,
  IAnnealingTrace,
  ICoolingSchedule,
  IParallelTemperingConfig,
  IParallelTemperingResult,
  IReplicaStats,
} from './types.js';
