/**
 * Ecosystem adapter types.
 *
 * Adapters translate between ecosystem-specific package registries
 * and the unified QADR dependency resolution format.
 */

import type { IDependencySpec, IResolvedPackage } from '../types.js';

/**
 * Package metadata from an ecosystem registry.
 */
export interface IPackageMetadata {
  /** Package name */
  readonly name: string;
  /** Available versions (newest first) */
  readonly versions: readonly IVersionMetadata[];
  /** Package description */
  readonly description?: string;
  /** Package license */
  readonly license?: string;
  /** Package homepage */
  readonly homepage?: string;
  /** Package repository */
  readonly repository?: string;
  /** Deprecation warning if deprecated */
  readonly deprecated?: string;
}

/**
 * Metadata for a specific package version.
 */
export interface IVersionMetadata {
  /** Version string */
  readonly version: string;
  /** Dependencies for this version */
  readonly dependencies: readonly IDependencySpec[];
  /** Development dependencies */
  readonly devDependencies?: readonly IDependencySpec[];
  /** Peer dependencies */
  readonly peerDependencies?: readonly IDependencySpec[];
  /** Optional dependencies */
  readonly optionalDependencies?: readonly IDependencySpec[];
  /** Publish timestamp */
  readonly publishedAt?: Date;
  /** Whether this version is deprecated */
  readonly deprecated?: boolean;
  /** Size in bytes */
  readonly size?: number;
  /** Integrity hash (e.g., SHA-512) */
  readonly integrity?: string;
}

/**
 * Lockfile entry for a resolved package.
 */
export interface ILockfileEntry {
  /** Package name */
  readonly name: string;
  /** Resolved version */
  readonly version: string;
  /** Integrity hash */
  readonly integrity: string;
  /** Registry URL */
  readonly resolved: string;
  /** Dependencies (name -> version) */
  readonly dependencies?: Record<string, string>;
}

/**
 * Parsed lockfile.
 */
export interface ILockfile {
  /** Lockfile format version */
  readonly version: number;
  /** All locked packages */
  readonly packages: readonly ILockfileEntry[];
}

/**
 * Manifest file (e.g., package.json, Cargo.toml).
 */
export interface IManifest {
  /** Package name */
  readonly name: string;
  /** Package version */
  readonly version: string;
  /** Dependencies */
  readonly dependencies: readonly IDependencySpec[];
  /** Development dependencies */
  readonly devDependencies?: readonly IDependencySpec[];
  /** Peer dependencies */
  readonly peerDependencies?: readonly IDependencySpec[];
  /** Optional dependencies */
  readonly optionalDependencies?: readonly IDependencySpec[];
  /** Raw manifest content (ecosystem-specific) */
  readonly raw?: unknown;
}

/**
 * Adapter cache for storing fetched metadata.
 */
export interface IAdapterCache {
  /** Get cached metadata */
  get(packageName: string): IPackageMetadata | undefined;
  /** Set cached metadata */
  set(packageName: string, metadata: IPackageMetadata): void;
  /** Check if package is cached */
  has(packageName: string): boolean;
  /** Clear all cache */
  clear(): void;
  /** Get cache stats */
  stats(): { hits: number; misses: number; size: number };
}

/**
 * Options for adapter operations.
 */
export interface IAdapterOptions {
  /** Custom registry URL */
  readonly registryUrl?: string;
  /** Request timeout in ms */
  readonly timeout?: number;
  /** Number of retries for failed requests */
  readonly retries?: number;
  /** Authentication token */
  readonly authToken?: string;
  /** Cache instance */
  readonly cache?: IAdapterCache;
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Ecosystem adapter interface.
 *
 * Each ecosystem (npm, pip, cargo, maven) implements this interface
 * to provide unified access to package metadata and version resolution.
 */
export interface IEcosystemAdapter {
  /** Ecosystem name (e.g., 'npm', 'pip', 'cargo', 'maven') */
  readonly name: string;

  /** Default registry URL */
  readonly defaultRegistryUrl: string;

  /**
   * Fetch metadata for a package.
   *
   * @param packageName - The package name
   * @param options - Optional settings
   * @returns Package metadata or undefined if not found
   */
  fetchPackage(
    packageName: string,
    options?: IAdapterOptions
  ): Promise<IPackageMetadata | undefined>;

  /**
   * Fetch metadata for multiple packages in parallel.
   *
   * @param packageNames - The package names
   * @param options - Optional settings
   * @returns Map of package name to metadata
   */
  fetchPackages(
    packageNames: readonly string[],
    options?: IAdapterOptions
  ): Promise<Map<string, IPackageMetadata>>;

  /**
   * Parse a manifest file.
   *
   * @param content - The manifest file content
   * @returns Parsed manifest
   */
  parseManifest(content: string): IManifest;

  /**
   * Generate a manifest file.
   *
   * @param manifest - The manifest to serialize
   * @returns Serialized manifest content
   */
  generateManifest(manifest: IManifest): string;

  /**
   * Parse a lockfile.
   *
   * @param content - The lockfile content
   * @returns Parsed lockfile
   */
  parseLockfile(content: string): ILockfile;

  /**
   * Generate a lockfile.
   *
   * @param solution - Resolved packages
   * @returns Serialized lockfile content
   */
  generateLockfile(solution: readonly IResolvedPackage[]): string;

  /**
   * Validate a version string for this ecosystem.
   *
   * @param version - The version string
   * @returns Whether the version is valid
   */
  isValidVersion(version: string): boolean;

  /**
   * Validate a version constraint for this ecosystem.
   *
   * @param constraint - The version constraint
   * @returns Whether the constraint is valid
   */
  isValidConstraint(constraint: string): boolean;

  /**
   * Normalize a package name (e.g., handle scopes, case).
   *
   * @param packageName - The package name
   * @returns Normalized package name
   */
  normalizePackageName(packageName: string): string;
}

/**
 * Create a simple in-memory cache.
 */
export function createMemoryCache(): IAdapterCache {
  const cache = new Map<string, IPackageMetadata>();
  let hits = 0;
  let misses = 0;

  return {
    get(packageName: string): IPackageMetadata | undefined {
      const result = cache.get(packageName);
      if (result) {
        hits++;
      } else {
        misses++;
      }
      return result;
    },

    set(packageName: string, metadata: IPackageMetadata): void {
      cache.set(packageName, metadata);
    },

    has(packageName: string): boolean {
      return cache.has(packageName);
    },

    clear(): void {
      cache.clear();
      hits = 0;
      misses = 0;
    },

    stats(): { hits: number; misses: number; size: number } {
      return { hits, misses, size: cache.size };
    },
  };
}
