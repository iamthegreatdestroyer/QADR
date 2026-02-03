/**
 * @qadr/config - Default Configuration Values
 *
 * Provides sensible defaults for all QADR configuration options.
 *
 * @packageDocumentation
 */

import type {
  QadrConfig,
  AnnealingConfig,
  QuboConfig,
  CacheConfig,
  SecurityConfig,
  OutputConfig,
  PerformanceConfig,
  LoggingConfig,
  NpmConfig,
  PipConfig,
  CargoConfig,
} from './types.js';

// =============================================================================
// COMPONENT DEFAULTS
// =============================================================================

/**
 * Default annealing configuration
 */
export const DEFAULT_ANNEALING_CONFIG: AnnealingConfig = {
  initialTemperature: 1000,
  finalTemperature: 0.001,
  coolingRate: 0.95,
  iterationsPerTemperature: 1000,
  maxIterations: 100000,
  schedule: 'exponential',
  replicaCount: 4,
  exchangeInterval: 100,
  seed: null,
  adaptiveTemperature: true,
  targetAcceptanceRate: 0.23,
};

/**
 * Default QUBO configuration
 */
export const DEFAULT_QUBO_CONFIG: QuboConfig = {
  versionWeight: 1.0,
  dependencyWeight: 10.0,
  conflictWeight: 100.0,
  minimalityWeight: 0.5,
  securityWeight: 5.0,
  stabilityWeight: 2.0,
  maxVersionsPerPackage: 50,
  epsilon: 1e-10,
  constraintPropagation: true,
  symmetryBreaking: true,
};

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  backend: 'filesystem',
  directory: '.qadr-cache',
  maxSize: 500,
  ttl: 86400,
  registryData: true,
  resolutions: true,
  quboMatrices: false,
  compression: 6,
};

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enabled: true,
  minSeverity: 'medium',
  failOnVulnerability: false,
  failSeverities: ['critical', 'high'],
  databases: ['osv', 'nvd'],
  ignoredIds: [],
  maxDataAge: 24,
  suggestPatches: true,
};

/**
 * Default output configuration
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  format: 'lockfile',
  file: null,
  pretty: true,
  metadata: true,
  timing: false,
  stats: false,
  graph: false,
  graphFormat: 'svg',
  colors: true,
  verbosity: 1,
};

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  workers: 0,
  maxMemory: 0,
  timeout: 300,
  profiling: false,
  profileDir: '.qadr-profiles',
  lowMemory: false,
  batchSize: 100,
  simd: true,
};

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  file: null,
  format: 'pretty',
  timestamps: true,
  colors: true,
  maxFileSize: 10,
  maxFiles: 5,
  filter: [],
};

/**
 * Default npm configuration
 */
export const DEFAULT_NPM_CONFIG: NpmConfig = {
  honorLockfile: true,
  optional: true,
  peer: true,
  dev: true,
  registryAliases: {},
  scopedRegistries: {},
};

/**
 * Default pip configuration
 */
export const DEFAULT_PIP_CONFIG: PipConfig = {
  extras: [],
  requirementsFormat: false,
  indexUrls: ['https://pypi.org/simple'],
};

/**
 * Default cargo configuration
 */
export const DEFAULT_CARGO_CONFIG: CargoConfig = {
  features: [],
  allFeatures: false,
  noDefaultFeatures: false,
};

// =============================================================================
// COMPLETE DEFAULT CONFIGURATION
// =============================================================================

/**
 * Complete default QADR configuration
 */
export const DEFAULT_CONFIG: QadrConfig = {
  version: '1.0',
  ecosystem: 'npm',
  strategy: 'balanced',
  annealing: DEFAULT_ANNEALING_CONFIG,
  qubo: DEFAULT_QUBO_CONFIG,
  registries: {
    npm: {
      url: 'https://registry.npmjs.org',
      type: 'npm',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    pypi: {
      url: 'https://pypi.org/pypi',
      type: 'pip',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    crates: {
      url: 'https://crates.io/api/v1',
      type: 'cargo',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
  },
  cache: DEFAULT_CACHE_CONFIG,
  security: DEFAULT_SECURITY_CONFIG,
  output: DEFAULT_OUTPUT_CONFIG,
  performance: DEFAULT_PERFORMANCE_CONFIG,
  logging: DEFAULT_LOGGING_CONFIG,
  ecosystems: {
    npm: DEFAULT_NPM_CONFIG,
    pip: DEFAULT_PIP_CONFIG,
    cargo: DEFAULT_CARGO_CONFIG,
  },
  overrides: {},
  resolutions: {},
  ignore: [],
  prerelease: false,
};

// =============================================================================
// PRESETS
// =============================================================================

/**
 * Fast resolution preset - prioritizes speed over optimality
 */
export const FAST_PRESET: Partial<QadrConfig> = {
  annealing: {
    ...DEFAULT_ANNEALING_CONFIG,
    initialTemperature: 100,
    maxIterations: 10000,
    replicaCount: 2,
    iterationsPerTemperature: 500,
  },
  qubo: {
    ...DEFAULT_QUBO_CONFIG,
    maxVersionsPerPackage: 20,
    constraintPropagation: true,
  },
  performance: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    timeout: 60,
  },
};

/**
 * Quality preset - prioritizes solution quality
 */
export const QUALITY_PRESET: Partial<QadrConfig> = {
  annealing: {
    ...DEFAULT_ANNEALING_CONFIG,
    initialTemperature: 5000,
    maxIterations: 500000,
    replicaCount: 8,
    iterationsPerTemperature: 2000,
    coolingRate: 0.99,
  },
  qubo: {
    ...DEFAULT_QUBO_CONFIG,
    maxVersionsPerPackage: 100,
  },
  performance: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    timeout: 600,
  },
};

/**
 * Security-focused preset
 */
export const SECURITY_PRESET: Partial<QadrConfig> = {
  security: {
    ...DEFAULT_SECURITY_CONFIG,
    failOnVulnerability: true,
    minSeverity: 'low',
    failSeverities: ['critical', 'high', 'medium'],
  },
  qubo: {
    ...DEFAULT_QUBO_CONFIG,
    securityWeight: 50.0,
    stabilityWeight: 10.0,
  },
  strategy: 'security',
};

/**
 * Minimal preset - fewest dependencies
 */
export const MINIMAL_PRESET: Partial<QadrConfig> = {
  strategy: 'minimal',
  qubo: {
    ...DEFAULT_QUBO_CONFIG,
    minimalityWeight: 10.0,
    versionWeight: 0.1,
  },
  ecosystems: {
    npm: {
      ...DEFAULT_NPM_CONFIG,
      optional: false,
      dev: false,
    },
  },
};

/**
 * Available configuration presets
 */
export const PRESETS: Record<string, Partial<QadrConfig>> = {
  fast: FAST_PRESET,
  quality: QUALITY_PRESET,
  security: SECURITY_PRESET,
  minimal: MINIMAL_PRESET,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get default registry configuration for an ecosystem
 */
export function getDefaultRegistry(ecosystem: string): QadrConfig['registries'][string] | undefined {
  const registries: Record<string, QadrConfig['registries'][string]> = {
    npm: {
      url: 'https://registry.npmjs.org',
      type: 'npm',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    pip: {
      url: 'https://pypi.org/pypi',
      type: 'pip',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    cargo: {
      url: 'https://crates.io/api/v1',
      type: 'cargo',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    maven: {
      url: 'https://repo1.maven.org/maven2',
      type: 'maven',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    go: {
      url: 'https://proxy.golang.org',
      type: 'go',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
    nuget: {
      url: 'https://api.nuget.org/v3/index.json',
      type: 'nuget',
      timeout: 30000,
      retries: 3,
      cache: true,
      cacheTtl: 3600,
      concurrency: 10,
      insecure: false,
    },
  };

  return registries[ecosystem];
}

/**
 * Apply a preset to the default configuration
 */
export function applyPreset(preset: keyof typeof PRESETS): QadrConfig {
  const presetConfig = PRESETS[preset];
  if (!presetConfig) {
    throw new Error(`Unknown preset: ${preset}`);
  }

  return deepMerge(DEFAULT_CONFIG, presetConfig) as QadrConfig;
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}
