/**
 * @qadr/config
 *
 * Configuration loading, validation, and management for QADR.
 *
 * @example
 * ```typescript
 * import { loadConfig, DEFAULT_CONFIG } from '@qadr/config';
 *
 * // Load configuration from file
 * const result = await loadConfig({ cwd: '/path/to/project' });
 * if (result.ok) {
 *   console.log(result.value.config);
 * }
 *
 * // Use default configuration
 * console.log(DEFAULT_CONFIG.annealing.initialTemperature);
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Core types
  Ecosystem,
  ResolutionStrategy,
  AnnealingSchedule,
  OutputFormat,
  CacheBackend,
  VulnerabilitySeverity,

  // Configuration interfaces
  AnnealingConfig,
  QuboConfig,
  RegistryConfig,
  CacheConfig,
  SecurityConfig,
  OutputConfig,
  PerformanceConfig,
  LoggingConfig,

  // Ecosystem-specific configs
  NpmConfig,
  PipConfig,
  CargoConfig,
  EcosystemConfigs,

  // Main configuration
  QadrConfig,
  PartialQadrConfig,
  ConfigSource,
  LoadedConfig,
} from './types.js';

// =============================================================================
// DEFAULT EXPORTS
// =============================================================================

export {
  // Default configurations
  DEFAULT_CONFIG,
  DEFAULT_ANNEALING_CONFIG,
  DEFAULT_QUBO_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_OUTPUT_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_LOGGING_CONFIG,
  DEFAULT_NPM_CONFIG,
  DEFAULT_PIP_CONFIG,
  DEFAULT_CARGO_CONFIG,

  // Presets
  PRESETS,
  FAST_PRESET,
  QUALITY_PRESET,
  SECURITY_PRESET,
  MINIMAL_PRESET,

  // Helper functions
  getDefaultRegistry,
  applyPreset,
} from './defaults.js';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

export {
  // Enum schemas
  EcosystemSchema,
  ResolutionStrategySchema,
  AnnealingScheduleSchema,
  OutputFormatSchema,
  CacheBackendSchema,
  VulnerabilitySeveritySchema,
  LogLevelSchema,
  LogFormatSchema,
  GraphFormatSchema,

  // Component schemas
  AnnealingConfigSchema,
  QuboConfigSchema,
  RegistryConfigSchema,
  CacheConfigSchema,
  SecurityConfigSchema,
  OutputConfigSchema,
  PerformanceConfigSchema,
  LoggingConfigSchema,

  // Ecosystem schemas
  NpmConfigSchema,
  PipConfigSchema,
  CargoConfigSchema,
  EcosystemConfigsSchema,

  // Main schema
  QadrConfigSchema,
  PartialQadrConfigSchema,

  // Validation types
  type ValidatedConfig,
  type PartialValidatedConfig,

  // Validation functions
  validateConfig,
  safeValidateConfig,
  validatePartialConfig,
  formatValidationErrors,
} from './schema.js';

// =============================================================================
// LOADER EXPORTS
// =============================================================================

export {
  // Loader options
  type LoaderOptions,

  // Main loader functions
  loadConfig,
  loadConfigSync,

  // Config file helpers
  CONFIG_FILES,
  generateConfigFile,
  mergeConfigs,

  // Cache management
  clearConfigCache,
} from './loader.js';
