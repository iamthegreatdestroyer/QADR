/**
 * @qadr/config - Configuration Type Definitions
 *
 * Comprehensive TypeScript types for QADR configuration.
 * Supports all package ecosystems (npm, pip, cargo, maven, go, nuget).
 *
 * @packageDocumentation
 */

import type { LogLevel } from '@qadr/shared';

// =============================================================================
// ECOSYSTEM TYPES
// =============================================================================

/**
 * Supported package ecosystems
 */
export type Ecosystem = 'npm' | 'pip' | 'cargo' | 'maven' | 'go' | 'nuget' | 'composer' | 'rubygems';

/**
 * Resolution strategies for dependency conflicts
 */
export type ResolutionStrategy = 'newest' | 'oldest' | 'minimal' | 'balanced' | 'security';

/**
 * Annealing schedule types
 */
export type AnnealingSchedule = 'linear' | 'exponential' | 'logarithmic' | 'adaptive';

/**
 * Output format for resolution results
 */
export type OutputFormat = 'json' | 'yaml' | 'toml' | 'lockfile' | 'tree' | 'graph';

// =============================================================================
// ANNEALING CONFIGURATION
// =============================================================================

/**
 * Configuration for simulated annealing parameters
 */
export interface AnnealingConfig {
  /**
   * Initial temperature for annealing
   * Higher values allow more exploration
   * @default 1000
   */
  initialTemperature: number;

  /**
   * Final temperature (stopping condition)
   * @default 0.001
   */
  finalTemperature: number;

  /**
   * Cooling rate for temperature reduction
   * Value between 0 and 1 (typically 0.95-0.99)
   * @default 0.95
   */
  coolingRate: number;

  /**
   * Number of iterations at each temperature level
   * @default 1000
   */
  iterationsPerTemperature: number;

  /**
   * Maximum total iterations before termination
   * @default 100000
   */
  maxIterations: number;

  /**
   * Type of cooling schedule
   * @default 'exponential'
   */
  schedule: AnnealingSchedule;

  /**
   * Number of parallel replicas for parallel tempering
   * Higher values improve solution quality but increase computation
   * @default 4
   */
  replicaCount: number;

  /**
   * Exchange interval for parallel tempering (iterations between swaps)
   * @default 100
   */
  exchangeInterval: number;

  /**
   * Random seed for reproducibility (null for random)
   * @default null
   */
  seed: number | null;

  /**
   * Enable adaptive temperature adjustment based on acceptance rate
   * @default true
   */
  adaptiveTemperature: boolean;

  /**
   * Target acceptance rate for adaptive temperature (0-1)
   * @default 0.23
   */
  targetAcceptanceRate: number;
}

// =============================================================================
// QUBO CONFIGURATION
// =============================================================================

/**
 * Configuration for QUBO problem formulation
 */
export interface QuboConfig {
  /**
   * Weight for version preference constraints
   * Higher values favor newer versions
   * @default 1.0
   */
  versionWeight: number;

  /**
   * Weight for dependency satisfaction constraints
   * Higher values penalize unsatisfied dependencies more
   * @default 10.0
   */
  dependencyWeight: number;

  /**
   * Weight for conflict penalties
   * Higher values more strongly discourage conflicting versions
   * @default 100.0
   */
  conflictWeight: number;

  /**
   * Weight for minimizing total packages
   * Higher values prefer solutions with fewer packages
   * @default 0.5
   */
  minimalityWeight: number;

  /**
   * Weight for security score (CVE-free packages)
   * @default 5.0
   */
  securityWeight: number;

  /**
   * Weight for preferring stable versions over pre-releases
   * @default 2.0
   */
  stabilityWeight: number;

  /**
   * Maximum number of versions to consider per package
   * Limits problem size for large registries
   * @default 50
   */
  maxVersionsPerPackage: number;

  /**
   * Precision for floating-point comparisons
   * @default 1e-10
   */
  epsilon: number;

  /**
   * Enable constraint propagation before annealing
   * Reduces problem size by eliminating impossible assignments
   * @default true
   */
  constraintPropagation: boolean;

  /**
   * Enable symmetry breaking to avoid equivalent solutions
   * @default true
   */
  symmetryBreaking: boolean;
}

// =============================================================================
// REGISTRY CONFIGURATION
// =============================================================================

/**
 * Configuration for a package registry
 */
export interface RegistryConfig {
  /**
   * Registry URL
   */
  url: string;

  /**
   * Authentication token (if required)
   */
  token?: string;

  /**
   * Registry type/ecosystem
   */
  type: Ecosystem;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout: number;

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  retries: number;

  /**
   * Enable request caching
   * @default true
   */
  cache: boolean;

  /**
   * Cache TTL in seconds
   * @default 3600
   */
  cacheTtl: number;

  /**
   * Maximum concurrent requests
   * @default 10
   */
  concurrency: number;

  /**
   * Custom headers for requests
   */
  headers?: Record<string, string>;

  /**
   * Proxy URL (if needed)
   */
  proxy?: string;

  /**
   * Skip SSL verification (not recommended)
   * @default false
   */
  insecure: boolean;
}

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Cache storage backend
 */
export type CacheBackend = 'memory' | 'filesystem' | 'redis' | 'sqlite';

/**
 * Configuration for caching
 */
export interface CacheConfig {
  /**
   * Enable caching
   * @default true
   */
  enabled: boolean;

  /**
   * Cache backend type
   * @default 'filesystem'
   */
  backend: CacheBackend;

  /**
   * Cache directory (for filesystem backend)
   * @default '.qadr-cache'
   */
  directory: string;

  /**
   * Maximum cache size in MB
   * @default 500
   */
  maxSize: number;

  /**
   * Default TTL in seconds
   * @default 86400
   */
  ttl: number;

  /**
   * Cache registry metadata
   * @default true
   */
  registryData: boolean;

  /**
   * Cache resolution results
   * @default true
   */
  resolutions: boolean;

  /**
   * Cache QUBO matrices
   * @default false
   */
  quboMatrices: boolean;

  /**
   * Redis connection URL (for redis backend)
   */
  redisUrl?: string;

  /**
   * SQLite database path (for sqlite backend)
   */
  sqlitePath?: string;

  /**
   * Compression level (0-9, 0 = disabled)
   * @default 6
   */
  compression: number;
}

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Severity levels for vulnerabilities
 */
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Configuration for security scanning
 */
export interface SecurityConfig {
  /**
   * Enable security scanning
   * @default true
   */
  enabled: boolean;

  /**
   * Minimum severity to report
   * @default 'medium'
   */
  minSeverity: VulnerabilitySeverity;

  /**
   * Fail resolution if vulnerabilities found
   * @default false
   */
  failOnVulnerability: boolean;

  /**
   * Severity levels that cause failure
   * @default ['critical', 'high']
   */
  failSeverities: VulnerabilitySeverity[];

  /**
   * Vulnerability database sources
   * @default ['osv', 'nvd']
   */
  databases: string[];

  /**
   * Ignored vulnerability IDs (for false positives or accepted risks)
   */
  ignoredIds: string[];

  /**
   * Maximum age of vulnerability data in hours before refresh
   * @default 24
   */
  maxDataAge: number;

  /**
   * Enable automatic patching suggestions
   * @default true
   */
  suggestPatches: boolean;
}

// =============================================================================
// OUTPUT CONFIGURATION
// =============================================================================

/**
 * Configuration for output formatting
 */
export interface OutputConfig {
  /**
   * Output format
   * @default 'lockfile'
   */
  format: OutputFormat;

  /**
   * Output file path (null for stdout)
   */
  file: string | null;

  /**
   * Pretty-print output (where applicable)
   * @default true
   */
  pretty: boolean;

  /**
   * Include metadata in output
   * @default true
   */
  metadata: boolean;

  /**
   * Include timing information
   * @default false
   */
  timing: boolean;

  /**
   * Include resolution statistics
   * @default false
   */
  stats: boolean;

  /**
   * Generate dependency graph visualization
   * @default false
   */
  graph: boolean;

  /**
   * Graph output format
   * @default 'svg'
   */
  graphFormat: 'svg' | 'png' | 'dot' | 'json';

  /**
   * Color output for terminal
   * @default true
   */
  colors: boolean;

  /**
   * Verbosity level (0-3)
   * @default 1
   */
  verbosity: number;
}

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

/**
 * Configuration for performance tuning
 */
export interface PerformanceConfig {
  /**
   * Number of worker threads
   * 0 = auto-detect based on CPU cores
   * @default 0
   */
  workers: number;

  /**
   * Maximum memory usage in MB (0 = unlimited)
   * @default 0
   */
  maxMemory: number;

  /**
   * Resolution timeout in seconds (0 = unlimited)
   * @default 300
   */
  timeout: number;

  /**
   * Enable profiling
   * @default false
   */
  profiling: boolean;

  /**
   * Profiling output directory
   * @default '.qadr-profiles'
   */
  profileDir: string;

  /**
   * Enable memory-efficient mode (slower but uses less RAM)
   * @default false
   */
  lowMemory: boolean;

  /**
   * Batch size for parallel processing
   * @default 100
   */
  batchSize: number;

  /**
   * Enable SIMD optimizations (if available)
   * @default true
   */
  simd: boolean;
}

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================

/**
 * Configuration for logging
 */
export interface LoggingConfig {
  /**
   * Log level
   * @default 'info'
   */
  level: LogLevel;

  /**
   * Log file path (null for console only)
   */
  file: string | null;

  /**
   * Log format
   * @default 'pretty'
   */
  format: 'pretty' | 'json' | 'compact';

  /**
   * Include timestamps
   * @default true
   */
  timestamps: boolean;

  /**
   * Enable colored output
   * @default true
   */
  colors: boolean;

  /**
   * Maximum log file size in MB before rotation
   * @default 10
   */
  maxFileSize: number;

  /**
   * Number of rotated log files to keep
   * @default 5
   */
  maxFiles: number;

  /**
   * Log component filter (empty = all)
   */
  filter: string[];
}

// =============================================================================
// ECOSYSTEM-SPECIFIC CONFIGURATION
// =============================================================================

/**
 * npm-specific configuration
 */
export interface NpmConfig {
  /**
   * Honor package-lock.json if present
   * @default true
   */
  honorLockfile: boolean;

  /**
   * Include optional dependencies
   * @default true
   */
  optional: boolean;

  /**
   * Include peer dependencies
   * @default true
   */
  peer: boolean;

  /**
   * Include dev dependencies
   * @default true
   */
  dev: boolean;

  /**
   * Use npm registry aliases
   */
  registryAliases: Record<string, string>;

  /**
   * Scoped package registries
   */
  scopedRegistries: Record<string, string>;
}

/**
 * pip-specific configuration
 */
export interface PipConfig {
  /**
   * Python version constraint
   */
  pythonVersion?: string;

  /**
   * Platform markers
   */
  platform?: string;

  /**
   * Include extra dependencies
   */
  extras: string[];

  /**
   * Use requirements.txt format
   * @default false
   */
  requirementsFormat: boolean;

  /**
   * Index URLs
   */
  indexUrls: string[];
}

/**
 * cargo-specific configuration
 */
export interface CargoConfig {
  /**
   * Include features
   */
  features: string[];

  /**
   * Include all features
   * @default false
   */
  allFeatures: boolean;

  /**
   * No default features
   * @default false
   */
  noDefaultFeatures: boolean;

  /**
   * Target triple
   */
  target?: string;
}

/**
 * Ecosystem-specific configurations
 */
export interface EcosystemConfigs {
  npm?: Partial<NpmConfig>;
  pip?: Partial<PipConfig>;
  cargo?: Partial<CargoConfig>;
}

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

/**
 * Complete QADR configuration
 */
export interface QadrConfig {
  /**
   * Configuration file version
   * @default '1.0'
   */
  version: string;

  /**
   * Target ecosystem
   * @default 'npm'
   */
  ecosystem: Ecosystem;

  /**
   * Resolution strategy
   * @default 'balanced'
   */
  strategy: ResolutionStrategy;

  /**
   * Annealing parameters
   */
  annealing: AnnealingConfig;

  /**
   * QUBO formulation parameters
   */
  qubo: QuboConfig;

  /**
   * Registry configurations
   */
  registries: Record<string, RegistryConfig>;

  /**
   * Cache configuration
   */
  cache: CacheConfig;

  /**
   * Security configuration
   */
  security: SecurityConfig;

  /**
   * Output configuration
   */
  output: OutputConfig;

  /**
   * Performance configuration
   */
  performance: PerformanceConfig;

  /**
   * Logging configuration
   */
  logging: LoggingConfig;

  /**
   * Ecosystem-specific configurations
   */
  ecosystems: EcosystemConfigs;

  /**
   * Package overrides (force specific versions)
   */
  overrides: Record<string, string>;

  /**
   * Package resolutions (alias packages)
   */
  resolutions: Record<string, string>;

  /**
   * Packages to ignore
   */
  ignore: string[];

  /**
   * Allow pre-release versions
   * @default false
   */
  prerelease: boolean;

  /**
   * Extend from another config file
   */
  extends?: string;
}

/**
 * Partial configuration (for user-provided config files)
 */
export type PartialQadrConfig = {
  [K in keyof QadrConfig]?: QadrConfig[K] extends object
    ? Partial<QadrConfig[K]>
    : QadrConfig[K];
};

/**
 * Configuration source information
 */
export interface ConfigSource {
  /**
   * Path to the configuration file
   */
  path: string;

  /**
   * Was this config file found?
   */
  found: boolean;

  /**
   * Format of the config file
   */
  format: 'json' | 'yaml' | 'toml' | 'js' | 'ts';

  /**
   * Was this config inherited from parent?
   */
  inherited: boolean;
}

/**
 * Loaded configuration with metadata
 */
export interface LoadedConfig {
  /**
   * The resolved configuration
   */
  config: QadrConfig;

  /**
   * Sources that contributed to this config
   */
  sources: ConfigSource[];

  /**
   * Directory where the config was found
   */
  rootDir: string;

  /**
   * Was the config loaded from defaults?
   */
  isDefault: boolean;
}
