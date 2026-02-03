/**
 * QUBO module exports.
 */

export { QUBOBuilder } from './qubo-builder.js';
export type { IQUBOBuilderInput } from './qubo-builder.js';

export { ConstraintEncoder } from './constraint-encoder.js';

export { Hamiltonian } from './hamiltonian.js';

export {
  DEFAULT_QUBO_CONFIG,
  QUBOConstraintType,
  parseQuadraticKey,
  quadraticKey,
} from './types.js';

export type {
  IQUBOConfig,
  IQUBOConstraint,
  IQUBOMatrix,
  IQUBOProblem,
  IQUBOSolution,
  IQUBOStats,
  IQUBOVariable,
} from './types.js';
