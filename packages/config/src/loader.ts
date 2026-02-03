/**
 * @qadr/config - Configuration Loader
 *
 * Loads and merges QADR configuration from multiple sources:
 * - Configuration files (qadr.config.{js,ts,json,yaml,toml})
 * - Environment variables
 * - CLI arguments
 * - Programmatic overrides
 *
 * @packageDocumentation
 */

import { cosmiconfig, type CosmiconfigResult } from 'cosmiconfig';
import { resolve, dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { ok, err, type Result } from '@qadr/shared';
import {
  validateConfig,
  safeValidateConfig,
  formatValidationErrors,
  type ValidatedConfig,
} from './schema.js';
import { DEFAULT_CONFIG, PRESETS, applyPreset } from './defaults.js';
import type {
  QadrConfig,
  PartialQadrConfig,
  LoadedConfig,
  ConfigSource,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Module name for cosmiconfig
 */
const MODULE_NAME = 'qadr';

/**
 * Supported configuration file names
 */
export const CONFIG_FILES = [
  'qadr.config.js',
  'qadr.config.ts',
  'qadr.config.mjs',
  'qadr.config.cjs',
  'qadr.config.json',
  'qadr.config.yaml',
  'qadr.config.yml',
  'qadr.config.toml',
  '.qadrrc',
  '.qadrrc.json',
  '.qadrrc.yaml',
  '.qadrrc.yml',
];

/**
 * Environment variable prefix
 */
const ENV_PREFIX = 'QADR_';

// =============================================================================
// LOADER OPTIONS
// =============================================================================

export interface LoaderOptions {
  /**
   * Starting directory for config search
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Explicit path to config file
   */
  configPath?: string;

  /**
   * Stop at this directory (don't traverse upward)
   */
  stopDir?: string;

  /**
   * Preset to apply before user config
   */
  preset?: keyof typeof PRESETS;

  /**
   * CLI argument overrides
   */
  cliOverrides?: PartialQadrConfig;

  /**
   * Load environment variables
   * @default true
   */
  envVars?: boolean;

  /**
   * Cache the configuration
   * @default true
   */
  cache?: boolean;

  /**
   * Clear the cache before loading
   * @default false
   */
  clearCache?: boolean;
}

// =============================================================================
// CONFIGURATION CACHE
// =============================================================================

const configCache = new Map<string, LoadedConfig>();

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// =============================================================================
// ENVIRONMENT VARIABLE PARSING
// =============================================================================

/**
 * Parse environment variables into configuration
 */
function parseEnvVars(): PartialQadrConfig {
  const config: PartialQadrConfig = {};

  // Parse specific environment variables
  const envMappings: Array<{
    env: string;
    path: string[];
    transform?: (value: string) => unknown;
  }> = [
    { env: 'QADR_ECOSYSTEM', path: ['ecosystem'] },
    { env: 'QADR_STRATEGY', path: ['strategy'] },
    { env: 'QADR_LOG_LEVEL', path: ['logging', 'level'] },
    { env: 'QADR_CACHE_ENABLED', path: ['cache', 'enabled'], transform: (v) => v === 'true' },
    { env: 'QADR_CACHE_DIR', path: ['cache', 'directory'] },
    { env: 'QADR_TIMEOUT', path: ['performance', 'timeout'], transform: parseInt },
    { env: 'QADR_WORKERS', path: ['performance', 'workers'], transform: parseInt },
    { env: 'QADR_PRERELEASE', path: ['prerelease'], transform: (v) => v === 'true' },
    { env: 'QADR_SECURITY_ENABLED', path: ['security', 'enabled'], transform: (v) => v === 'true' },
    { env: 'QADR_SECURITY_FAIL', path: ['security', 'failOnVulnerability'], transform: (v) => v === 'true' },
    { env: 'QADR_ANNEALING_ITERATIONS', path: ['annealing', 'maxIterations'], transform: parseInt },
    { env: 'QADR_ANNEALING_REPLICAS', path: ['annealing', 'replicaCount'], transform: parseInt },
    { env: 'QADR_ANNEALING_TEMP', path: ['annealing', 'initialTemperature'], transform: parseFloat },
    { env: 'QADR_ANNEALING_COOLING', path: ['annealing', 'coolingRate'], transform: parseFloat },
  ];

  for (const mapping of envMappings) {
    const value = process.env[mapping.env];
    if (value !== undefined) {
      setNestedValue(
        config,
        mapping.path,
        mapping.transform ? mapping.transform(value) : value
      );
    }
  }

  // Parse registry tokens
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('QADR_REGISTRY_') && key.endsWith('_TOKEN') && value) {
      const registryName = key
        .replace('QADR_REGISTRY_', '')
        .replace('_TOKEN', '')
        .toLowerCase();

      if (!config.registries) {
        config.registries = {};
      }
      if (!config.registries[registryName]) {
        config.registries[registryName] = {};
      }
      (config.registries[registryName] as Record<string, unknown>).token = value;
    }
  }

  return config;
}

/**
 * Set a nested value in an object
 */
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

// =============================================================================
// CONFIGURATION MERGING
// =============================================================================

/**
 * Deep merge configuration objects
 */
export function mergeConfigs(...configs: PartialQadrConfig[]): QadrConfig {
  let result = { ...DEFAULT_CONFIG } as Record<string, unknown>;

  for (const config of configs) {
    result = deepMerge(result, config as Record<string, unknown>);
  }

  return result as unknown as QadrConfig;
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

// =============================================================================
// INHERITANCE RESOLUTION
// =============================================================================

/**
 * Resolve configuration inheritance
 */
async function resolveExtends(
  config: PartialQadrConfig,
  configDir: string,
  visited: Set<string> = new Set()
): Promise<PartialQadrConfig[]> {
  const configs: PartialQadrConfig[] = [];

  if (config.extends) {
    const extendsPath = resolve(configDir, config.extends);

    if (visited.has(extendsPath)) {
      throw new Error(`Circular configuration inheritance detected: ${extendsPath}`);
    }
    visited.add(extendsPath);

    const parentConfig = await loadConfigFile(extendsPath);
    if (parentConfig) {
      const parentConfigs = await resolveExtends(parentConfig, dirname(extendsPath), visited);
      configs.push(...parentConfigs);
    }
  }

  // Remove 'extends' from the config before adding it
  const { extends: _, ...configWithoutExtends } = config;
  configs.push(configWithoutExtends);

  return configs;
}

// =============================================================================
// FILE LOADING
// =============================================================================

/**
 * Load a configuration file directly
 */
async function loadConfigFile(filePath: string): Promise<PartialQadrConfig | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return JSON.parse(readFileSync(filePath, 'utf-8'));

    case 'yaml':
    case 'yml': {
      // Dynamic import for yaml parsing
      const yaml = await import('js-yaml').catch(() => null);
      if (yaml) {
        return yaml.load(readFileSync(filePath, 'utf-8')) as PartialQadrConfig;
      }
      throw new Error('YAML configuration files require js-yaml to be installed');
    }

    case 'toml': {
      // Dynamic import for toml parsing
      const toml = await import('@iarna/toml').catch(() => null);
      if (toml) {
        return toml.parse(readFileSync(filePath, 'utf-8')) as PartialQadrConfig;
      }
      throw new Error('TOML configuration files require @iarna/toml to be installed');
    }

    case 'js':
    case 'mjs':
    case 'cjs':
    case 'ts': {
      const module = await import(filePath);
      return module.default || module;
    }

    default:
      // Try JSON as fallback
      return JSON.parse(readFileSync(filePath, 'utf-8'));
  }
}

// =============================================================================
// MAIN LOADER
// =============================================================================

/**
 * Load QADR configuration
 *
 * @param options - Loader options
 * @returns Loaded and validated configuration
 */
export async function loadConfig(
  options: LoaderOptions = {}
): Promise<Result<LoadedConfig, Error>> {
  const {
    cwd = process.cwd(),
    configPath,
    stopDir,
    preset,
    cliOverrides,
    envVars = true,
    cache = true,
    clearCache: shouldClearCache = false,
  } = options;

  // Clear cache if requested
  if (shouldClearCache) {
    clearConfigCache();
  }

  // Check cache
  const cacheKey = `${cwd}:${configPath || ''}:${preset || ''}`;
  if (cache && configCache.has(cacheKey)) {
    return ok(configCache.get(cacheKey)!);
  }

  try {
    const sources: ConfigSource[] = [];
    const configsToMerge: PartialQadrConfig[] = [];

    // 1. Apply preset if specified
    if (preset) {
      if (!(preset in PRESETS)) {
        return err(new Error(`Unknown preset: ${preset}`));
      }
      configsToMerge.push(PRESETS[preset]);
    }

    // 2. Search for config file
    let searchResult: CosmiconfigResult = null;
    let rootDir = cwd;

    if (configPath) {
      // Load explicit config path
      const absolutePath = resolve(cwd, configPath);
      const config = await loadConfigFile(absolutePath);
      if (config) {
        searchResult = {
          config,
          filepath: absolutePath,
          isEmpty: false,
        };
        rootDir = dirname(absolutePath);
      }
    } else {
      // Search for config file
      const explorer = cosmiconfig(MODULE_NAME, {
        searchPlaces: CONFIG_FILES,
        stopDir,
      });

      searchResult = await explorer.search(cwd);
      if (searchResult) {
        rootDir = dirname(searchResult.filepath);
      }
    }

    // 3. Process found config
    if (searchResult && !searchResult.isEmpty) {
      sources.push({
        path: searchResult.filepath,
        found: true,
        format: getConfigFormat(searchResult.filepath),
        inherited: false,
      });

      // Resolve inheritance
      const inheritedConfigs = await resolveExtends(
        searchResult.config as PartialQadrConfig,
        rootDir
      );

      // Mark inherited configs
      for (let i = 0; i < inheritedConfigs.length - 1; i++) {
        sources.push({
          path: `<inherited ${i + 1}>`,
          found: true,
          format: 'json',
          inherited: true,
        });
      }

      configsToMerge.push(...inheritedConfigs);
    }

    // 4. Apply environment variables
    if (envVars) {
      const envConfig = parseEnvVars();
      if (Object.keys(envConfig).length > 0) {
        configsToMerge.push(envConfig);
      }
    }

    // 5. Apply CLI overrides
    if (cliOverrides) {
      configsToMerge.push(cliOverrides);
    }

    // 6. Merge all configurations
    const mergedConfig = mergeConfigs(...configsToMerge);

    // 7. Validate final configuration
    const validationResult = safeValidateConfig(mergedConfig);
    if (!validationResult.success) {
      const errors = formatValidationErrors(validationResult.error);
      return err(new Error(`Configuration validation failed:\n${errors.join('\n')}`));
    }

    // 8. Create loaded config result
    const loadedConfig: LoadedConfig = {
      config: validationResult.data as QadrConfig,
      sources,
      rootDir,
      isDefault: sources.length === 0,
    };

    // 9. Cache result
    if (cache) {
      configCache.set(cacheKey, loadedConfig);
    }

    return ok(loadedConfig);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Load configuration synchronously (limited format support)
 */
export function loadConfigSync(options: LoaderOptions = {}): Result<LoadedConfig, Error> {
  const { cwd = process.cwd(), configPath, preset, cliOverrides, envVars = true } = options;

  try {
    const sources: ConfigSource[] = [];
    const configsToMerge: PartialQadrConfig[] = [];

    // Apply preset
    if (preset) {
      if (!(preset in PRESETS)) {
        return err(new Error(`Unknown preset: ${preset}`));
      }
      configsToMerge.push(PRESETS[preset]);
    }

    // Search for JSON config files only (sync)
    let foundConfig: PartialQadrConfig | null = null;
    let configDir = cwd;

    if (configPath) {
      const absolutePath = resolve(cwd, configPath);
      if (existsSync(absolutePath)) {
        foundConfig = JSON.parse(readFileSync(absolutePath, 'utf-8'));
        configDir = dirname(absolutePath);
        sources.push({
          path: absolutePath,
          found: true,
          format: 'json',
          inherited: false,
        });
      }
    } else {
      // Search up the directory tree
      let searchDir = cwd;
      while (searchDir !== dirname(searchDir)) {
        for (const filename of ['qadr.config.json', '.qadrrc', '.qadrrc.json']) {
          const filepath = join(searchDir, filename);
          if (existsSync(filepath)) {
            foundConfig = JSON.parse(readFileSync(filepath, 'utf-8'));
            configDir = searchDir;
            sources.push({
              path: filepath,
              found: true,
              format: 'json',
              inherited: false,
            });
            break;
          }
        }
        if (foundConfig) break;
        searchDir = dirname(searchDir);
      }
    }

    if (foundConfig) {
      configsToMerge.push(foundConfig);
    }

    // Apply environment variables
    if (envVars) {
      configsToMerge.push(parseEnvVars());
    }

    // Apply CLI overrides
    if (cliOverrides) {
      configsToMerge.push(cliOverrides);
    }

    // Merge and validate
    const mergedConfig = mergeConfigs(...configsToMerge);
    const validationResult = safeValidateConfig(mergedConfig);

    if (!validationResult.success) {
      const errors = formatValidationErrors(validationResult.error);
      return err(new Error(`Configuration validation failed:\n${errors.join('\n')}`));
    }

    return ok({
      config: validationResult.data as QadrConfig,
      sources,
      rootDir: configDir,
      isDefault: sources.length === 0,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get configuration format from file path
 */
function getConfigFormat(filepath: string): ConfigSource['format'] {
  const ext = filepath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'js';
    case 'ts':
      return 'ts';
    default:
      return 'json';
  }
}

// =============================================================================
// CONFIG FILE GENERATION
// =============================================================================

/**
 * Generate a default configuration file
 */
export function generateConfigFile(
  format: 'json' | 'yaml' | 'toml' = 'json',
  preset?: keyof typeof PRESETS
): string {
  const config = preset ? applyPreset(preset) : DEFAULT_CONFIG;

  switch (format) {
    case 'json':
      return JSON.stringify(config, null, 2);

    case 'yaml':
      // Simplified YAML output
      return jsonToYaml(config);

    case 'toml':
      // Simplified TOML output
      return jsonToToml(config);

    default:
      return JSON.stringify(config, null, 2);
  }
}

/**
 * Simple JSON to YAML converter (for basic configs)
 */
function jsonToYaml(obj: object, indent = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      lines.push(`${prefix}${key}: null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      lines.push(jsonToYaml(value, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`${prefix}  -`);
          lines.push(jsonToYaml(item, indent + 2));
        } else {
          lines.push(`${prefix}  - ${JSON.stringify(item)}`);
        }
      }
    } else {
      lines.push(`${prefix}${key}: ${JSON.stringify(value)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Simple JSON to TOML converter (for basic configs)
 */
function jsonToToml(obj: object, prefix = ''): string {
  const lines: string[] = [];
  const sections: Array<{ key: string; value: object }> = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sections.push({ key, value });
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] !== 'object') {
        lines.push(`${key} = ${JSON.stringify(value)}`);
      }
    } else if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else {
      lines.push(`${key} = ${value}`);
    }
  }

  for (const section of sections) {
    const sectionPath = prefix ? `${prefix}.${section.key}` : section.key;
    lines.push('');
    lines.push(`[${sectionPath}]`);
    lines.push(jsonToToml(section.value, sectionPath));
  }

  return lines.join('\n');
}
