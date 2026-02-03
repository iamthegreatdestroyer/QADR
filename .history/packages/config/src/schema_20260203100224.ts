/**
 * @qadr/config - Configuration Schema Validation
 *
 * Zod schemas for validating QADR configuration files.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const EcosystemSchema = z.enum([
  'npm',
  'pip',
  'cargo',
  'maven',
  'go',
  'nuget',
  'composer',
  'rubygems',
]);

export const ResolutionStrategySchema = z.enum([
  'newest',
  'oldest',
  'minimal',
  'balanced',
  'security',
]);

export const AnnealingScheduleSchema = z.enum([
  'linear',
  'exponential',
  'logarithmic',
  'adaptive',
]);

export const OutputFormatSchema = z.enum([
  'json',
  'yaml',
  'toml',
  'lockfile',
  'tree',
  'graph',
]);

export const CacheBackendSchema = z.enum([
  'memory',
  'filesystem',
  'redis',
  'sqlite',
]);

export const VulnerabilitySeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const LogLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);

export const LogFormatSchema = z.enum(['pretty', 'json', 'compact']);

export const GraphFormatSchema = z.enum(['svg', 'png', 'dot', 'json']);

// =============================================================================
// COMPONENT SCHEMAS
// =============================================================================

export const AnnealingConfigSchema = z.object({
  initialTemperature: z.number().positive().default(1000),
  finalTemperature: z.number().positive().default(0.001),
  coolingRate: z.number().min(0).max(1).default(0.95),
  iterationsPerTemperature: z.number().int().positive().default(1000),
  maxIterations: z.number().int().positive().default(100000),
  schedule: AnnealingScheduleSchema.default('exponential'),
  replicaCount: z.number().int().min(1).max(64).default(4),
  exchangeInterval: z.number().int().positive().default(100),
  seed: z.number().int().nullable().default(null),
  adaptiveTemperature: z.boolean().default(true),
  targetAcceptanceRate: z.number().min(0).max(1).default(0.23),
});

export const QuboConfigSchema = z.object({
  versionWeight: z.number().nonnegative().default(1.0),
  dependencyWeight: z.number().nonnegative().default(10.0),
  conflictWeight: z.number().nonnegative().default(100.0),
  minimalityWeight: z.number().nonnegative().default(0.5),
  securityWeight: z.number().nonnegative().default(5.0),
  stabilityWeight: z.number().nonnegative().default(2.0),
  maxVersionsPerPackage: z.number().int().min(1).max(1000).default(50),
  epsilon: z.number().positive().default(1e-10),
  constraintPropagation: z.boolean().default(true),
  symmetryBreaking: z.boolean().default(true),
});

export const RegistryConfigSchema = z.object({
  url: z.string().url(),
  token: z.string().optional(),
  type: EcosystemSchema,
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().nonnegative().default(3),
  cache: z.boolean().default(true),
  cacheTtl: z.number().int().nonnegative().default(3600),
  concurrency: z.number().int().min(1).max(100).default(10),
  headers: z.record(z.string()).optional(),
  proxy: z.string().url().optional(),
  insecure: z.boolean().default(false),
});

export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  backend: CacheBackendSchema.default('filesystem'),
  directory: z.string().default('.qadr-cache'),
  maxSize: z.number().int().positive().default(500),
  ttl: z.number().int().nonnegative().default(86400),
  registryData: z.boolean().default(true),
  resolutions: z.boolean().default(true),
  quboMatrices: z.boolean().default(false),
  redisUrl: z.string().url().optional(),
  sqlitePath: z.string().optional(),
  compression: z.number().int().min(0).max(9).default(6),
});

export const SecurityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minSeverity: VulnerabilitySeveritySchema.default('medium'),
  failOnVulnerability: z.boolean().default(false),
  failSeverities: z.array(VulnerabilitySeveritySchema).default(['critical', 'high']),
  databases: z.array(z.string()).default(['osv', 'nvd']),
  ignoredIds: z.array(z.string()).default([]),
  maxDataAge: z.number().int().positive().default(24),
  suggestPatches: z.boolean().default(true),
});

export const OutputConfigSchema = z.object({
  format: OutputFormatSchema.default('lockfile'),
  file: z.string().nullable().default(null),
  pretty: z.boolean().default(true),
  metadata: z.boolean().default(true),
  timing: z.boolean().default(false),
  stats: z.boolean().default(false),
  graph: z.boolean().default(false),
  graphFormat: GraphFormatSchema.default('svg'),
  colors: z.boolean().default(true),
  verbosity: z.number().int().min(0).max(3).default(1),
});

export const PerformanceConfigSchema = z.object({
  workers: z.number().int().nonnegative().default(0),
  maxMemory: z.number().int().nonnegative().default(0),
  timeout: z.number().int().nonnegative().default(300),
  profiling: z.boolean().default(false),
  profileDir: z.string().default('.qadr-profiles'),
  lowMemory: z.boolean().default(false),
  batchSize: z.number().int().positive().default(100),
  simd: z.boolean().default(true),
});

export const LoggingConfigSchema = z.object({
  level: LogLevelSchema.default('info'),
  file: z.string().nullable().default(null),
  format: LogFormatSchema.default('pretty'),
  timestamps: z.boolean().default(true),
  colors: z.boolean().default(true),
  maxFileSize: z.number().int().positive().default(10),
  maxFiles: z.number().int().positive().default(5),
  filter: z.array(z.string()).default([]),
});

// =============================================================================
// ECOSYSTEM-SPECIFIC SCHEMAS
// =============================================================================

export const NpmConfigSchema = z.object({
  honorLockfile: z.boolean().default(true),
  optional: z.boolean().default(true),
  peer: z.boolean().default(true),
  dev: z.boolean().default(true),
  registryAliases: z.record(z.string()).default({}),
  scopedRegistries: z.record(z.string()).default({}),
});

export const PipConfigSchema = z.object({
  pythonVersion: z.string().optional(),
  platform: z.string().optional(),
  extras: z.array(z.string()).default([]),
  requirementsFormat: z.boolean().default(false),
  indexUrls: z.array(z.string().url()).default(['https://pypi.org/simple']),
});

export const CargoConfigSchema = z.object({
  features: z.array(z.string()).default([]),
  allFeatures: z.boolean().default(false),
  noDefaultFeatures: z.boolean().default(false),
  target: z.string().optional(),
});

export const EcosystemConfigsSchema = z.object({
  npm: NpmConfigSchema.partial().optional(),
  pip: PipConfigSchema.partial().optional(),
  cargo: CargoConfigSchema.partial().optional(),
});

// =============================================================================
// MAIN CONFIGURATION SCHEMA
// =============================================================================

export const QadrConfigSchema = z.object({
  version: z.string().default('1.0'),
  ecosystem: EcosystemSchema.default('npm'),
  strategy: ResolutionStrategySchema.default('balanced'),
  annealing: AnnealingConfigSchema.partial().default({}),
  qubo: QuboConfigSchema.partial().default({}),
  registries: z.record(RegistryConfigSchema.partial()).default({}),
  cache: CacheConfigSchema.partial().default({}),
  security: SecurityConfigSchema.partial().default({}),
  output: OutputConfigSchema.partial().default({}),
  performance: PerformanceConfigSchema.partial().default({}),
  logging: LoggingConfigSchema.partial().default({}),
  ecosystems: EcosystemConfigsSchema.default({}),
  overrides: z.record(z.string()).default({}),
  resolutions: z.record(z.string()).default({}),
  ignore: z.array(z.string()).default([]),
  prerelease: z.boolean().default(false),
  extends: z.string().optional(),
});

// =============================================================================
// PARTIAL SCHEMA (for user config files)
// =============================================================================

export const PartialQadrConfigSchema = QadrConfigSchema.partial();

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export type ValidatedConfig = z.infer<typeof QadrConfigSchema>;
export type PartialValidatedConfig = z.infer<typeof PartialQadrConfigSchema>;

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): ValidatedConfig {
  return QadrConfigSchema.parse(config);
}

/**
 * Safely validate a configuration object
 */
export function safeValidateConfig(config: unknown): {
  success: true;
  data: ValidatedConfig;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = QadrConfigSchema.safeParse(config);
  return result;
}

/**
 * Validate a partial configuration object
 */
export function validatePartialConfig(config: unknown): PartialValidatedConfig {
  return PartialQadrConfigSchema.parse(config);
}

/**
 * Get human-readable validation errors
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return `${path ? `${path}: ` : ''}${err.message}`;
  });
}
