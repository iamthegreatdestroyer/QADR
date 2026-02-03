/**
 * @qadr/cli - Config Command
 *
 * Command for managing QADR configuration.
 *
 * @packageDocumentation
 */

import type { Command } from 'commander';
import type { ConfigOptions } from '../types.js';
import {
  createContext,
  handleError,
  createCliError,
  createKeyValueTable,
  box,
  success,
  warning,
  info,
  error,
} from '../utils/index.js';
import { generateConfigFile } from '@qadr/config';

/**
 * Register the config command
 */
export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Manage QADR configuration')
    .option('--list', 'Show all configuration')
    .option('--init', 'Initialize new configuration file')
    .option('--init-format <format>', 'Configuration format for init (json, yaml, toml, js, ts)')
    .option('--validate', 'Validate configuration')
    .option('--path', 'Show configuration file path')
    .option('--reset', 'Reset to defaults')
    .option('--edit', 'Edit configuration in editor')
    .argument('[key]', 'Configuration key to get/set')
    .argument('[value]', 'Value to set')
    .action(async (key: string | undefined, value: string | undefined, options: ConfigOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals();
      
      try {
        await configCommand({ ...globalOptions, ...options, key, value });
      } catch (err) {
        const ctx = await createContext(globalOptions);
        handleError(err, ctx.logger);
      }
    });
}

/**
 * Execute the config command
 */
async function configCommand(options: ConfigOptions): Promise<void> {
  const ctx = await createContext(options);
  const { logger, cwd, config } = ctx;

  // Initialize new config
  if (options.init) {
    await initConfig(cwd, options.initFormat ?? 'json');
    return;
  }

  // Show config path
  if (options.path) {
    if (config.sources.file) {
      console.log(config.sources.file);
    } else {
      console.log(warning('No configuration file found. Using defaults.'));
    }
    return;
  }

  // Validate config
  if (options.validate) {
    await validateConfig(config);
    return;
  }

  // Reset to defaults
  if (options.reset) {
    await resetConfig(cwd);
    return;
  }

  // Edit in editor
  if (options.edit) {
    await editConfig(config.sources.file);
    return;
  }

  // List all config
  if (options.list) {
    await listConfig(config);
    return;
  }

  // Get/Set specific key
  if (options.key) {
    if (options.value !== undefined) {
      await setConfigValue(cwd, config, options.key, options.value);
    } else {
      await getConfigValue(config, options.key);
    }
    return;
  }

  // Default: show summary
  await showConfigSummary(config);
}

// =============================================================================
// Command Handlers
// =============================================================================

async function initConfig(cwd: string, format: string): Promise<void> {
  const { join } = await import('node:path');
  const { access, writeFile } = await import('node:fs/promises');

  const extensions: Record<string, string> = {
    json: 'qadr.config.json',
    yaml: 'qadr.config.yaml',
    toml: 'qadr.config.toml',
    js: 'qadr.config.js',
    ts: 'qadr.config.ts',
  };

  const filename = extensions[format];
  if (!filename) {
    throw createCliError(`Invalid format: ${format}`, 1, {
      suggestions: ['Use one of: json, yaml, toml, js, ts'],
    });
  }

  const filepath = join(cwd, filename);

  // Check if file exists
  try {
    await access(filepath);
    throw createCliError(`Configuration file already exists: ${filename}`, 1, {
      suggestions: [
        'Use --reset to reset to defaults',
        'Delete the file manually and try again',
      ],
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  // Generate config file
  const content = generateConfigFile(format as 'json' | 'yaml' | 'toml' | 'js' | 'ts');
  await writeFile(filepath, content, 'utf-8');

  console.log(success(`Created configuration file: ${filename}`));
  console.log(info('Edit this file to customize QADR behavior.'));
}

async function validateConfig(config: import('@qadr/config').LoadedConfig): Promise<void> {
  const { validateConfig: validate } = await import('@qadr/config');

  try {
    validate(config.config);
    console.log(success('Configuration is valid'));

    if (config.sources.file) {
      console.log(info(`Source: ${config.sources.file}`));
    }
  } catch (err) {
    console.log(error('Configuration is invalid'));
    console.log('');

    if (err instanceof Error) {
      console.log(err.message);
    }

    process.exit(1);
  }
}

async function resetConfig(cwd: string): Promise<void> {
  const { join } = await import('node:path');
  const { unlink, readdir } = await import('node:fs/promises');

  const configFiles = [
    'qadr.config.json',
    'qadr.config.yaml',
    'qadr.config.yml',
    'qadr.config.toml',
    'qadr.config.js',
    'qadr.config.ts',
    '.qadrrc',
    '.qadrrc.json',
    '.qadrrc.yaml',
    '.qadrrc.yml',
  ];

  let deleted = false;

  for (const file of configFiles) {
    try {
      await unlink(join(cwd, file));
      console.log(success(`Deleted: ${file}`));
      deleted = true;
    } catch {
      // File doesn't exist
    }
  }

  if (deleted) {
    console.log(info('Configuration reset to defaults'));
  } else {
    console.log(warning('No configuration files found to delete'));
  }
}

async function editConfig(filepath: string | undefined): Promise<void> {
  if (!filepath) {
    throw createCliError('No configuration file found', 1, {
      suggestions: ['Run `qadr config --init` to create a configuration file'],
    });
  }

  const { spawn } = await import('node:child_process');

  const editor = process.env.EDITOR || process.env.VISUAL || 'code';

  return new Promise((resolve, reject) => {
    const child = spawn(editor, [filepath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(createCliError(`Editor exited with code ${code}`, code ?? 1));
      }
    });

    child.on('error', (err) => {
      reject(createCliError(`Failed to open editor: ${err.message}`, 1, {
        suggestions: ['Set the EDITOR environment variable to your preferred editor'],
      }));
    });
  });
}

async function listConfig(config: import('@qadr/config').LoadedConfig): Promise<void> {
  console.log(box(JSON.stringify(config.config, null, 2), 'QADR Configuration'));

  if (config.sources.file) {
    console.log(info(`\nSource: ${config.sources.file}`));
  }

  if (config.sources.extends) {
    console.log(info(`Extends: ${config.sources.extends.join(' → ')}`));
  }
}

async function getConfigValue(
  config: import('@qadr/config').LoadedConfig,
  key: string,
): Promise<void> {
  const value = getNestedValue(config.config, key);

  if (value === undefined) {
    throw createCliError(`Configuration key not found: ${key}`, 1);
  }

  if (typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(String(value));
  }
}

async function setConfigValue(
  cwd: string,
  config: import('@qadr/config').LoadedConfig,
  key: string,
  value: string,
): Promise<void> {
  if (!config.sources.file) {
    throw createCliError('No configuration file found', 1, {
      suggestions: ['Run `qadr config --init` to create a configuration file first'],
    });
  }

  const { readFile, writeFile } = await import('node:fs/promises');

  // Read current config
  const content = await readFile(config.sources.file, 'utf-8');
  let configData: Record<string, unknown>;

  try {
    configData = JSON.parse(content);
  } catch {
    throw createCliError('Only JSON configuration files can be modified programmatically', 1, {
      suggestions: ['Edit the configuration file manually'],
    });
  }

  // Parse value
  let parsedValue: unknown = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  // Set nested value
  setNestedValue(configData, key, parsedValue);

  // Write back
  await writeFile(config.sources.file, JSON.stringify(configData, null, 2), 'utf-8');

  console.log(success(`Set ${key} = ${JSON.stringify(parsedValue)}`));
}

async function showConfigSummary(config: import('@qadr/config').LoadedConfig): Promise<void> {
  const summary: Record<string, string | number | boolean> = {
    Ecosystem: config.config.ecosystem ?? 'auto-detect',
    Strategy: config.config.strategy ?? 'balanced',
    'Cache Enabled': config.config.cache?.enabled ?? true,
    'Security Scan': config.config.security?.enabled ?? true,
    'Log Level': config.config.logging?.level ?? 'info',
  };

  console.log(createKeyValueTable(summary));

  if (config.sources.file) {
    console.log(info(`\nConfiguration file: ${config.sources.file}`));
  } else {
    console.log(warning('\nUsing default configuration'));
    console.log(info('Run `qadr config --init` to create a configuration file'));
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
