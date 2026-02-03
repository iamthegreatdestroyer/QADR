/**
 * QUBO module exports.
 */

export { QUBOBuilder } from './qubo-builder.js';
export type { IQUBOBuilderInput } from './qubo-builder.js';

export { ConstraintEncoder } from './constraint-encoder.js';

export { Hamiltonian } from './hamiltonian.js';

export {
  QUBOConstraintType,
  DEFAULT_QUBO_CONFIG,
  quadraticKey,
  parseQuadraticKey,
} from './types.js';

export type {
  IQUBOVariable,
  IQUBOMatrix,
  IQUBOConstraint,
  IQUBOProblem,
  IQUBOConfig,
  IQUBOStats,
  IQUBOSolution,
} from './types.js';
