/**
 * @qadr/cli - CLI Context Utilities
 *
 * Context management for CLI execution.
 *
 * @packageDocumentation
 */

import { loadConfig } from '@qadr/config';
import type { LoadedConfig } from '@qadr/config';
import { createLogger, type Logger } from '@qadr/shared';
import type { GlobalOptions, CliContext, CliError } from '../types.js';
import { disableColors } from './format.js';

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Create CLI execution context
 */
export async function createContext(options: GlobalOptions): Promise<CliContext> {
  const cwd = options.cwd ?? process.cwd();

  const configResult = await loadConfig({
    cwd,
    ...(options.config && { configPath: options.config }),
  });

  const { DEFAULT_CONFIG } = await import('@qadr/config');
  const loadedConfig: LoadedConfig = configResult.ok
    ? configResult.value
    : { config: DEFAULT_CONFIG, sources: [], rootDir: cwd, isDefault: true };

  const logger = createLogger('qadr');

  if (options.noColor) {
    disableColors();
  }

  const isCI = Boolean(
    process.env['CI'] ||
    process.env['CONTINUOUS_INTEGRATION'] ||
    process.env['GITHUB_ACTIONS'] ||
    process.env['GITLAB_CI'] ||
    process.env['CIRCLECI'] ||
    process.env['TRAVIS'],
  );

  const isInteractive = !isCI && process.stdout.isTTY && process.stdin.isTTY;
  const terminalWidth = process.stdout.columns ?? 80;

  return {
    cwd,
    options,
    config: loadedConfig,
    logger,
    isCI,
    isInteractive,
    terminalWidth,
  };
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Create a CLI error
 */
export function createCliError(
  message: string,
  exitCode: number = 1,
  options: {
    details?: string;
    suggestions?: string[];
  } = {},
): CliError {
  const error = new Error(message) as CliError;
  error.name = 'CliError';
  error.exitCode = exitCode;
  if (options.details !== undefined) error.details = options.details;
  if (options.suggestions !== undefined) error.suggestions = options.suggestions;
  return error;
}

/**
 * Handle CLI error and exit
 */
export function handleError(error: unknown, logger: Logger): never {
  if (isCliError(error)) {
    logger.error(error.message);

    if (error.details) {
      logger.error('');
      logger.error('Details:');
      logger.error(`  ${error.details}`);
    }

    if (error.suggestions && error.suggestions.length > 0) {
      logger.error('');
      logger.error('Suggestions:');
      for (const suggestion of error.suggestions) {
        logger.error(`  • ${suggestion}`);
      }
    }

    process.exit(error.exitCode);
  } else if (error instanceof Error) {
    logger.error(`Error: ${error.message}`);

    if (process.env['DEBUG'] || process.env['QADR_DEBUG']) {
      logger.error('');
      logger.error('Stack trace:');
      logger.error(error.stack ?? '');
    }

    process.exit(1);
  } else {
    logger.error(`Unknown error: ${String(error)}`);
    process.exit(1);
  }
}

/**
 * Check if error is a CLI error
 */
export function isCliError(error: unknown): error is CliError {
  return error instanceof Error && 'exitCode' in error;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a file exists
 */
export async function validateFileExists(path: string): Promise<void> {
  const { access } = await import('node:fs/promises');

  try {
    await access(path);
  } catch {
    throw createCliError(`File not found: ${path}`, 1, {
      suggestions: [
        'Check that the file path is correct',
        'Ensure the file exists in the specified location',
      ],
    });
  }
}

/**
 * Validate that a directory exists
 */
export async function validateDirectoryExists(path: string): Promise<void> {
  const { stat } = await import('node:fs/promises');

  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      throw createCliError(`Not a directory: ${path}`, 1);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createCliError(`Directory not found: ${path}`, 1, {
        suggestions: [
          'Check that the directory path is correct',
          'Create the directory if it does not exist',
        ],
      });
    }
    throw error;
  }
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Detect the package ecosystem from the current directory
 */
export async function detectEcosystem(cwd: string): Promise<string | null> {
  const { access } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const ecosystemFiles: Record<string, string> = {
    'package.json': 'npm',
    'requirements.txt': 'pip',
    'pyproject.toml': 'pip',
    'Pipfile': 'pip',
    'Cargo.toml': 'cargo',
    'pom.xml': 'maven',
    'build.gradle': 'maven',
    'go.mod': 'go',
    'Gemfile': 'rubygems',
    'composer.json': 'composer',
  };

  for (const [file, ecosystem] of Object.entries(ecosystemFiles)) {
    try {
      await access(join(cwd, file));
      return ecosystem;
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}

/**
 * Get package manager for npm ecosystem
 */
export async function detectPackageManager(cwd: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
  const { access } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const lockFiles: Record<string, 'npm' | 'yarn' | 'pnpm' | 'bun'> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'bun.lockb': 'bun',
    'package-lock.json': 'npm',
  };

  for (const [file, manager] of Object.entries(lockFiles)) {
    try {
      await access(join(cwd, file));
      return manager;
    } catch {
      // File doesn't exist, continue
    }
  }

  // Check for package manager field in package.json
  try {
    const { readFile } = await import('node:fs/promises');
    const packageJson = JSON.parse(
      await readFile(join(cwd, 'package.json'), 'utf-8'),
    );

    if (packageJson.packageManager) {
      if (packageJson.packageManager.startsWith('pnpm')) return 'pnpm';
      if (packageJson.packageManager.startsWith('yarn')) return 'yarn';
      if (packageJson.packageManager.startsWith('bun')) return 'bun';
    }
  } catch {
    // Ignore errors
  }

  return 'npm';
}

// =============================================================================
// Output Helpers
// =============================================================================

/**
 * Get output file path with appropriate extension
 */
export function getOutputPath(
  basePath: string | undefined,
  format: string,
  defaultName: string,
): string {
  if (basePath) {
    return basePath;
  }

  const extensions: Record<string, string> = {
    json: '.json',
    yaml: '.yaml',
    text: '.txt',
    markdown: '.md',
    html: '.html',
  };

  const ext = extensions[format] ?? '.json';
  return `${defaultName}${ext}`;
}

/**
 * Write output to file or stdout
 */
export async function writeOutput(
  content: string,
  path: string | undefined,
  logger: Logger,
): Promise<void> {
  if (path) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, content, 'utf-8');
    logger.info(`Output written to: ${path}`);
  } else {
    console.log(content);
  }
}
