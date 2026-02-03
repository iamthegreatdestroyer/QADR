/**
 * @qadr/core - Quantum-Annealed Dependency Resolution
 *
 * Public API for the core QUBO optimization engine.
 *
 * @packageDocumentation
 */

// ============================================================================
// Main Resolver
// ============================================================================
export { QUBOResolver } from './resolver/index.js';
export { DEFAULT_RESOLVER_CONFIG } from './resolver/index.js';
export type {
  IResolverConfig,
  IResolverResult,
  IResolverProgress,
  IResolverStats,
  IViolation,
} from './resolver/index.js';

// ============================================================================
// QUBO Components
// ============================================================================
export { QUBOBuilder } from './qubo/index.js';
export { ConstraintEncoder } from './qubo/index.js';
export { Hamiltonian } from './qubo/index.js';
export type {
  IQUBOMatrix,
  IQUBOVariable,
  IVariableMapping,
  IQUBOBuilderConfig,
} from './qubo/index.js';

// ============================================================================
// Annealing Algorithms
// ============================================================================
export { SimulatedAnnealing } from './annealing/index.js';
export { ParallelTempering } from './annealing/index.js';
export {
  exponentialCooling,
  linearCooling,
  logarithmicCooling,
  geometricCooling,
  hyperbolicCooling,
  cauchyCooling,
  boltzmannCooling,
  adaptiveCooling,
  reheatCooling,
} from './annealing/index.js';
export type {
  IAnnealingConfig,
  IAnnealingResult,
  IAnnealingState,
  IAnnealingTrace,
  ICoolingSchedule,
  IParallelTemperingConfig,
  IParallelTemperingResult,
  IReplica,
} from './annealing/index.js';

// ============================================================================
// Ecosystem Adapters
// ============================================================================
export {
  NpmAdapter,
  PipAdapter,
  CargoAdapter,
  MavenAdapter,
  createMemoryCache,
} from './adapters/index.js';
export type {
  IEcosystemAdapter,
  IPackageMetadata,
  IVersionMetadata,
  IAdapterOptions,
  IAdapterCache,
  IManifest,
  ILockfile,
  ILockfileEntry,
} from './adapters/index.js';

// ============================================================================
// Core Types
// ============================================================================
export type {
  IDependencySpec,
  IResolvedPackage,
  IDependencyGraph,
  IConflict,
} from './types.js';
