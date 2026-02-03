/**
 * @qadr/cli - Utilities
 *
 * Utility exports for the CLI application.
 *
 * @packageDocumentation
 */

// Format utilities
export {
  disableColors,
  enableColors,
  severityColor,
  statusColor,
  updateTypeColor,
  formatBytes,
  formatDuration,
  formatNumber,
  formatPercent,
  createTable,
  createKeyValueTable,
  formatVulnerabilitySummary,
  formatResolutionSummary,
  formatBenchmarkResults,
  success,
  error,
  warning,
  info,
  debug,
  header,
  section,
  box,
  progressBar,
  formatETA,
  formatTree,
} from './format.js';

// Spinner utilities
export {
  SpinnerManager,
  createSpinner,
  withSpinner,
  withProgress,
  PhaseSpinner,
} from './spinner.js';

// Context utilities
export {
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
} from './context.js';
