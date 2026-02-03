/**
 * @qadr/cli
 *
 * Command-line interface for QADR - Quantum-Annealed Dependency Resolution.
 *
 * This package provides the primary user interface for QADR, offering commands
 * for dependency resolution, security analysis, license auditing, and
 * performance benchmarking.
 *
 * @example
 * ```typescript
 * // The CLI is typically used from the command line:
 * // qadr resolve --ecosystem npm
 * // qadr analyze --security --licenses
 * // qadr benchmark --iterations 100
 *
 * // But you can also use it programmatically:
 * import { createContext, runResolve } from '@qadr/cli';
 *
 * const ctx = await createContext({ ecosystem: 'npm' });
 * const result = await runResolve(ctx);
 * ```
 *
 * @packageDocumentation
 */

// Re-export types
export type {
  GlobalOptions,
  ResolveOptions,
  AnalyzeOptions,
  BenchmarkOptions,
  ConfigOptions,
  ResolutionSummary,
  VulnerabilitySummary,
  LicenseSummary,
  BenchmarkResult,
  AnalysisResult,
  CliContext,
  CliError,
  ProgressState,
  TableColumn,
  SpinnerConfig,
} from './types.js';

// Re-export utilities
export {
  // Color functions
  disableColors,
  enableColors,
  severityColor,
  statusColor,
  updateTypeColor,
  
  // Formatting
  formatBytes,
  formatDuration,
  formatNumber,
  formatPercent,
  createTable,
  createKeyValueTable,
  formatVulnerabilitySummary,
  formatResolutionSummary,
  formatBenchmarkResults,
  
  // Messages
  success,
  error,
  warning,
  info,
  debug,
  header,
  section,
  box,
  progressBar,
  formatTree,
  
  // Spinners
  SpinnerManager,
  createSpinner,
  withSpinner,
  withProgress,
  PhaseSpinner,
  
  // Context
  createContext,
  createCliError,
  handleError,
  isCliError,
  validateFileExists,
  validateDirectoryExists,
  detectEcosystem,
  detectPackageManager,
  getOutputPath,
  writeOutput,
} from './utils/index.js';

// Re-export commands for programmatic use
export {
  registerResolveCommand,
  registerAnalyzeCommand,
  registerBenchmarkCommand,
  registerConfigCommand,
} from './commands/index.js';
