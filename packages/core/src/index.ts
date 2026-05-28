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
export { DEFAULT_RESOLVER_CONFIG, QUBOResolver } from './resolver/index.js';
export type {
  IResolverConfig,
  IResolverProgress,
  IResolverResult,
  IResolverStats,
  IViolation,
} from './resolver/index.js';

// ============================================================================
// QUBO Components
// ============================================================================
export { ConstraintEncoder, Hamiltonian, QUBOBuilder } from './qubo/index.js';
export type {
  IQUBOMatrix,
  IQUBOVariable,
} from './qubo/index.js';

// ============================================================================
// Annealing Algorithms
// ============================================================================
export {
  ParallelTempering,
  SimulatedAnnealing,
  adaptiveCooling,
  boltzmannCooling,
  cauchyCooling,
  exponentialCooling,
  geometricWithReheat,
  linearCooling,
  logarithmicCooling,
  stepCooling,
} from './annealing/index.js';
export type {
  IAnnealingConfig,
  IAnnealingResult,
  IAnnealingState,
  IAnnealingTrace,
  ICoolingSchedule,
  IParallelTemperingConfig,
  IParallelTemperingResult,
} from './annealing/index.js';

// ============================================================================
// Ecosystem Adapters
// ============================================================================
export {
  CargoAdapter,
  MavenAdapter,
  NpmAdapter,
  PipAdapter,
  createMemoryCache,
} from './adapters/index.js';
export type {
  IAdapterCache,
  IAdapterOptions,
  IEcosystemAdapter,
  ILockfile,
  ILockfileEntry,
  IManifest,
  IPackageMetadata,
  IVersionMetadata,
} from './adapters/index.js';

// ============================================================================
// Core Types
// ============================================================================
export type { IConflict, IDependencyGraph, IDependencyNode, IDependencySpec, IResolvedPackage } from './types.js';
