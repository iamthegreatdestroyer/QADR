/**
 * @qadr/core - Quantum-Annealed Dependency Resolution
 *
 * Public API for the core QUBO optimization engine.
 *
 * @packageDocumentation
 */

// Main resolver
export { QUBOResolver } from './resolver/qubo-resolver.js';
export type {
  IResolverOptions,
  IResolutionResult,
  IResolutionMetrics,
} from './resolver/qubo-resolver.js';

// QUBO components
export { QUBOBuilder } from './qubo/qubo-builder.js';
export { ConstraintEncoder } from './qubo/constraint-encoder.js';
export { Hamiltonian } from './qubo/hamiltonian.js';
export type {
  IQUBOMatrix,
  IQUBOVariable,
  IQUBOConstraint,
  IQUBOProblem,
} from './qubo/types.js';

// Annealing algorithms
export { SimulatedAnnealing } from './annealing/simulated-annealing.js';
export { ParallelTempering } from './annealing/parallel-tempering.js';
export {
  exponentialCooling,
  linearCooling,
  logarithmicCooling,
  adaptiveCooling,
} from './annealing/cooling-schedules.js';
export type {
  IAnnealingConfig,
  IAnnealingResult,
  IAnnealingState,
  ICoolingSchedule,
} from './annealing/types.js';

// Ecosystem adapters
export { createNpmAdapter } from './adapters/npm-adapter.js';
export { createPipAdapter } from './adapters/pip-adapter.js';
export { createCargoAdapter } from './adapters/cargo-adapter.js';
export { createMavenAdapter } from './adapters/maven-adapter.js';
export type {
  IEcosystemAdapter,
  IPackageMetadata,
  IDependencyGraph,
  IVersionInfo,
} from './adapters/types.js';

// Utility types
export type {
  IDependencySpec,
  IResolvedPackage,
  IConflict,
  ISolution,
} from './types.js';
