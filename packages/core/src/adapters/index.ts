/**
 * Ecosystem adapters exports.
 */

export { NpmAdapter } from './npm-adapter.js';
export { PipAdapter } from './pip-adapter.js';
export { CargoAdapter } from './cargo-adapter.js';
export { MavenAdapter } from './maven-adapter.js';

export { createMemoryCache } from './types.js';

export type {
  IEcosystemAdapter,
  IPackageMetadata,
  IVersionMetadata,
  IManifest,
  ILockfile,
  ILockfileEntry,
  IAdapterCache,
  IAdapterOptions,
} from './types.js';
