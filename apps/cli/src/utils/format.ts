/**
 * @qadr/cli - Formatting Utilities
 *
 * Utilities for formatting CLI output including colors, tables, and progress.
 *
 * @packageDocumentation
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  TableColumn,
  VulnerabilitySummary,
  ResolutionSummary,
  BenchmarkResult,
} from '../types.js';

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Disable colors globally
 */
export function disableColors(): void {
  chalk.level = 0;
}

/**
 * Enable colors globally
 */
export function enableColors(): void {
  chalk.level = 3; // True color
}

/**
 * Severity color mapping
 */
export function severityColor(severity: string): (text: string) => string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return chalk.bgRed.white.bold;
    case 'high':
      return chalk.red.bold;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

/**
 * Status color mapping
 */
export function statusColor(status: 'success' | 'error' | 'warning' | 'info'): (text: string) => string {
  switch (status) {
    case 'success':
      return chalk.green;
    case 'error':
      return chalk.red;
    case 'warning':
      return chalk.yellow;
    case 'info':
      return chalk.cyan;
    default:
      return chalk.white;
  }
}

/**
 * Update type color mapping
 */
export function updateTypeColor(type: 'patch' | 'minor' | 'major'): (text: string) => string {
  switch (type) {
    case 'patch':
      return chalk.green;
    case 'minor':
      return chalk.yellow;
    case 'major':
      return chalk.red;
    default:
      return chalk.white;
  }
}

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format milliseconds to human readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

// =============================================================================
// Table Formatting
// =============================================================================

/**
 * Create a formatted table
 */
export function createTable<T extends Record<string, unknown>>(
  data: T[],
  columns: TableColumn[],
): string {
  const table = new Table({
    head: columns.map(col => chalk.bold(col.header)),
    colWidths: columns.map(col => col.width),
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
    wordWrap: true,
  });

  for (const row of data) {
    const rowData = columns.map(col => {
      const value = row[col.key];
      const formatted = String(value ?? '');
      return col.color ? col.color(value) : formatted;
    });
    table.push(rowData);
  }

  return table.toString();
}

/**
 * Create a key-value table
 */
export function createKeyValueTable(
  data: Record<string, string | number | boolean>,
): string {
  const table = new Table({
    style: {
      border: ['gray'],
    },
  });

  for (const [key, value] of Object.entries(data)) {
    table.push([chalk.cyan(key), String(value)]);
  }

  return table.toString();
}

// =============================================================================
// Summary Formatting
// =============================================================================

/**
 * Format vulnerability summary
 */
export function formatVulnerabilitySummary(summary: VulnerabilitySummary): string {
  const parts: string[] = [];

  if (summary.critical > 0) {
    parts.push(chalk.bgRed.white.bold(` ${summary.critical} critical `));
  }
  if (summary.high > 0) {
    parts.push(chalk.red.bold(`${summary.high} high`));
  }
  if (summary.medium > 0) {
    parts.push(chalk.yellow(`${summary.medium} medium`));
  }
  if (summary.low > 0) {
    parts.push(chalk.blue(`${summary.low} low`));
  }

  if (parts.length === 0) {
    return chalk.green('✓ No vulnerabilities found');
  }

  return `Found ${summary.total} vulnerabilities: ${parts.join(', ')}`;
}

/**
 * Format resolution summary
 */
export function formatResolutionSummary(summary: ResolutionSummary): string {
  const lines: string[] = [
    '',
    chalk.bold.underline('Resolution Summary'),
    '',
    `  ${chalk.cyan('Packages:')}        ${formatNumber(summary.packageCount)}`,
    `  ${chalk.cyan('Direct deps:')}     ${formatNumber(summary.directCount)}`,
    `  ${chalk.cyan('Transitive deps:')} ${formatNumber(summary.transitiveCount)}`,
    `  ${chalk.cyan('Time:')}            ${formatDuration(summary.timeMs)}`,
    `  ${chalk.cyan('Conflicts:')}       ${formatNumber(summary.conflictsResolved)}`,
    '',
  ];

  // Add vulnerability summary if present
  if (summary.vulnerabilities.total > 0) {
    lines.push(`  ${formatVulnerabilitySummary(summary.vulnerabilities)}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format benchmark results
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const table = new Table({
    head: [
      chalk.bold('Benchmark'),
      chalk.bold('Ops/sec'),
      chalk.bold('Mean'),
      chalk.bold('Std Dev'),
      chalk.bold('Min'),
      chalk.bold('Max'),
    ].map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const result of results) {
    table.push([
      result.name,
      formatNumber(Math.round(result.opsPerSec)),
      formatDuration(result.meanMs),
      `±${formatDuration(result.stdDevMs)}`,
      formatDuration(result.minMs),
      formatDuration(result.maxMs),
    ]);
  }

  return table.toString();
}

// =============================================================================
// Message Formatting
// =============================================================================

/**
 * Format success message
 */
export function success(message: string): string {
  return `${chalk.green('✓')} ${message}`;
}

/**
 * Format error message
 */
export function error(message: string): string {
  return `${chalk.red('✖')} ${message}`;
}

/**
 * Format warning message
 */
export function warning(message: string): string {
  return `${chalk.yellow('⚠')} ${message}`;
}

/**
 * Format info message
 */
export function info(message: string): string {
  return `${chalk.cyan('ℹ')} ${message}`;
}

/**
 * Format debug message
 */
export function debug(message: string): string {
  return chalk.gray(`⦿ ${message}`);
}

/**
 * Format a header/title
 */
export function header(text: string): string {
  const line = '─'.repeat(Math.min(text.length + 4, 60));
  return `\n${chalk.cyan(line)}\n${chalk.bold.cyan(`  ${text}`)}\n${chalk.cyan(line)}\n`;
}

/**
 * Format a section header
 */
export function section(text: string): string {
  return `\n${chalk.bold.underline(text)}\n`;
}

// =============================================================================
// Box Drawing
// =============================================================================

/**
 * Draw a box around text
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map(l => l.length), title?.length ?? 0);
  const width = maxWidth + 4;

  const top = title
    ? `┌─ ${chalk.bold(title)} ${'─'.repeat(width - title.length - 5)}┐`
    : `┌${'─'.repeat(width - 2)}┐`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;

  const paddedLines = lines.map(line => {
    const padding = ' '.repeat(maxWidth - line.length);
    return `│ ${line}${padding} │`;
  });

  return [top, ...paddedLines, bottom].join('\n');
}

// =============================================================================
// Progress Formatting
// =============================================================================

/**
 * Create a progress bar string
 */
export function progressBar(
  progress: number,
  width: number = 40,
  showPercent: boolean = true,
): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = showPercent ? ` ${progress.toFixed(0)}%` : '';

  return `[${bar}]${percent}`;
}

/**
 * Format ETA
 */
export function formatETA(ms: number): string {
  if (ms < 0 || !isFinite(ms)) {
    return 'calculating...';
  }
  return `ETA: ${formatDuration(ms)}`;
}

// =============================================================================
// Tree Formatting
// =============================================================================

/**
 * Format a dependency tree
 */
export function formatTree(
  name: string,
  children: Array<{ name: string; version: string; children?: Array<{ name: string; version: string }> }>,
  level: number = 0,
): string {
  const indent = '  '.repeat(level);
  const prefix = level === 0 ? '' : '├─ ';
  const lines: string[] = [`${indent}${prefix}${chalk.bold(name)}`];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLast = i === children.length - 1;
    const childPrefix = isLast ? '└─ ' : '├─ ';
    const childIndent = '  '.repeat(level + 1);

    lines.push(`${childIndent}${childPrefix}${child.name}@${chalk.cyan(child.version)}`);

    if (child.children && child.children.length > 0) {
      for (const grandchild of child.children) {
        const grandchildPrefix = isLast ? '   └─ ' : '│  └─ ';
        lines.push(`${childIndent}${grandchildPrefix}${grandchild.name}@${chalk.gray(grandchild.version)}`);
      }
    }
  }

  return lines.join('\n');
}
