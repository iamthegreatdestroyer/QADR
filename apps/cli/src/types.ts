/**
 * @qadr/cli - Type Definitions
 *
 * TypeScript type definitions for the QADR CLI application.
 *
 * @packageDocumentation
 * @module @qadr/cli
 */

import type { Ecosystem, ResolutionStrategy, OutputFormat } from '@qadr/config';
import type { LogLevel } from '@qadr/shared';
import type { IDependencyGraph } from '@qadr/core';

// =============================================================================
// CLI Option Types
// =============================================================================

/**
 * Global CLI options available to all commands
 */
export interface GlobalOptions {
  /** Configuration file path */
  config?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Enable quiet mode (minimal output) */
  quiet?: boolean;
  /** Disable colors in output */
  noColor?: boolean;
  /** Output format */
  format?: OutputFormat;
  /** Log level override */
  logLevel?: LogLevel;
  /** Working directory */
  cwd?: string;
}

/**
 * Options for the resolve command
 */
export interface ResolveOptions extends GlobalOptions {
  /** Target ecosystem */
  ecosystem?: Ecosystem;
  /** Resolution strategy */
  strategy?: ResolutionStrategy;
  /** Package manifest file path */
  manifest?: string;
  /** Lockfile path */
  lockfile?: string;
  /** Output file path */
  output?: string;
  /** Skip writing lockfile */
  dryRun?: boolean;
  /** Maximum resolution time in seconds */
  timeout?: number;
  /** Include dev dependencies */
  dev?: boolean;
  /** Include optional dependencies */
  optional?: boolean;
  /** Use preset configuration */
  preset?: 'fast' | 'quality' | 'security' | 'minimal';
  /** Force resolution even if lockfile exists */
  force?: boolean;
  /** Enable parallel processing */
  parallel?: boolean;
  /** Number of parallel workers */
  workers?: number;
}

/**
 * Options for the analyze command
 */
export interface AnalyzeOptions extends GlobalOptions {
  /** Target ecosystem */
  ecosystem?: Ecosystem;
  /** Package manifest file path */
  manifest?: string;
  /** Lockfile path */
  lockfile?: string;
  /** Include vulnerability scan */
  security?: boolean;
  /** Include license analysis */
  licenses?: boolean;
  /** Include duplicate detection */
  duplicates?: boolean;
  /** Include update suggestions */
  updates?: boolean;
  /** Output file path */
  output?: string;
  /** Depth of dependency tree to analyze */
  depth?: number;
}

/**
 * Options for the benchmark command
 */
export interface BenchmarkOptions extends GlobalOptions {
  /** Benchmark iterations */
  iterations?: number;
  /** Warmup iterations */
  warmup?: number;
  /** Compare with other resolvers */
  compare?: boolean;
  /** Include memory profiling */
  memory?: boolean;
  /** Include CPU profiling */
  cpu?: boolean;
  /** Benchmark suite to run */
  suite?: 'small' | 'medium' | 'large' | 'all';
  /** Output file path */
  output?: string;
  /** Export benchmark results */
  export?: string;
}

/**
 * Options for the config command
 */
export interface ConfigOptions extends GlobalOptions {
  /** Configuration key to get/set */
  key?: string;
  /** Value to set */
  value?: string;
  /** Show all configuration */
  list?: boolean;
  /** Initialize new configuration file */
  init?: boolean;
  /** Configuration format for init */
  initFormat?: 'json' | 'yaml' | 'toml' | 'js' | 'ts';
  /** Validate configuration */
  validate?: boolean;
  /** Show configuration file path */
  path?: boolean;
  /** Reset to defaults */
  reset?: boolean;
  /** Edit configuration in editor */
  edit?: boolean;
}

// =============================================================================
// CLI Output Types
// =============================================================================

/**
 * Resolution summary for CLI output
 */
export interface ResolutionSummary {
  /** Number of packages resolved */
  packageCount: number;
  /** Number of direct dependencies */
  directCount: number;
  /** Number of transitive dependencies */
  transitiveCount: number;
  /** Resolution time in milliseconds */
  timeMs: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Number of vulnerabilities found */
  vulnerabilities: VulnerabilitySummary;
  /** License summary */
  licenses: LicenseSummary;
}

/**
 * Vulnerability summary for CLI output
 */
export interface VulnerabilitySummary {
  /** Critical severity count */
  critical: number;
  /** High severity count */
  high: number;
  /** Medium severity count */
  medium: number;
  /** Low severity count */
  low: number;
  /** Total vulnerability count */
  total: number;
}

/**
 * License summary for CLI output
 */
export interface LicenseSummary {
  /** Map of license name to count */
  licenses: Map<string, number>;
  /** Packages with unknown licenses */
  unknown: number;
  /** Packages with problematic licenses */
  problematic: string[];
}

/**
 * Benchmark result for CLI output
 */
export interface BenchmarkResult {
  /** Benchmark name */
  name: string;
  /** Number of iterations */
  iterations: number;
  /** Mean time in milliseconds */
  meanMs: number;
  /** Standard deviation in milliseconds */
  stdDevMs: number;
  /** Minimum time in milliseconds */
  minMs: number;
  /** Maximum time in milliseconds */
  maxMs: number;
  /** Operations per second */
  opsPerSec: number;
  /** Memory usage in bytes */
  memoryBytes?: number;
}

/**
 * Analysis result for CLI output
 */
export interface AnalysisResult {
  /** Dependency graph */
  graph: IDependencyGraph;
  /** Vulnerability scan results */
  vulnerabilities?: VulnerabilityReport[];
  /** License analysis results */
  licenses?: LicenseReport[];
  /** Duplicate package detection */
  duplicates?: DuplicateReport[];
  /** Available updates */
  updates?: UpdateReport[];
}

/**
 * Vulnerability report entry
 */
export interface VulnerabilityReport {
  /** Package name */
  package: string;
  /** Package version */
  version: string;
  /** Vulnerability ID (e.g., CVE) */
  id: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Vulnerability title */
  title: string;
  /** Description */
  description: string;
  /** Fixed version if available */
  fixedVersion?: string;
  /** URL for more information */
  url?: string;
}

/**
 * License report entry
 */
export interface LicenseReport {
  /** Package name */
  package: string;
  /** Package version */
  version: string;
  /** License identifier (e.g., MIT, Apache-2.0) */
  license: string;
  /** Whether license is OSI approved */
  osiApproved: boolean;
  /** Whether license is FSF approved */
  fsfApproved: boolean;
  /** Whether license is copyleft */
  copyleft: boolean;
}

/**
 * Duplicate package report
 */
export interface DuplicateReport {
  /** Package name */
  package: string;
  /** All versions found */
  versions: string[];
  /** Paths where duplicates are required */
  paths: string[][];
  /** Potential disk space savings in bytes */
  savingsBytes: number;
}

/**
 * Update availability report
 */
export interface UpdateReport {
  /** Package name */
  package: string;
  /** Current version */
  currentVersion: string;
  /** Latest version matching semver constraints */
  wantedVersion: string;
  /** Absolute latest version */
  latestVersion: string;
  /** Type of update */
  updateType: 'patch' | 'minor' | 'major';
  /** Whether update has breaking changes */
  hasBreaking: boolean;
}

// =============================================================================
// CLI UI Types
// =============================================================================

/**
 * Progress indicator state
 */
export interface ProgressState {
  /** Current phase */
  phase: string;
  /** Phase progress (0-100) */
  progress: number;
  /** Current operation message */
  message: string;
  /** Start time */
  startTime: number;
  /** Estimated time remaining in ms */
  eta?: number;
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column header */
  header: string;
  /** Column key in data object */
  key: string;
  /** Column width */
  width?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Color function */
  color?: (value: unknown) => string;
}

/**
 * Spinner configuration
 */
export interface SpinnerConfig {
  /** Spinner text */
  text: string;
  /** Spinner type */
  spinner?: string;
  /** Color */
  color?: string;
  /** Success text */
  successText?: string;
  /** Failure text */
  failText?: string;
}

// =============================================================================
// CLI Context Types
// =============================================================================

/**
 * CLI execution context
 */
export interface CliContext {
  /** Working directory */
  cwd: string;
  /** Global options */
  options: GlobalOptions;
  /** Loaded configuration */
  config: import('@qadr/config').LoadedConfig;
  /** Logger instance */
  logger: import('@qadr/shared').Logger;
  /** Whether running in CI environment */
  isCI: boolean;
  /** Whether running interactively */
  isInteractive: boolean;
  /** Terminal width */
  terminalWidth: number;
}

/**
 * CLI error with exit code
 */
export interface CliError extends Error {
  /** Exit code for the process */
  exitCode: number;
  /** Additional details */
  details?: string;
  /** Suggestions for fixing the error */
  suggestions?: string[];
}

// =============================================================================
// Export
// =============================================================================

export type { IResolverResult, IDependencyGraph } from '@qadr/core';
