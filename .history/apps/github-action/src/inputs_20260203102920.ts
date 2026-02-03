/**
 * GitHub Action Input Handling
 *
 * Parses and validates action inputs from the workflow.
 */

import * as core from '@actions/core';
import * as path from 'path';

/**
 * Action input configuration
 */
export interface ActionInputs {
  manifestPath: string;
  lockPath: string;
  ecosystem: 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'pip' | 'go';
  mode: 'resolve' | 'analyze' | 'benchmark';
  failOnVulnerabilities: boolean;
  vulnerabilityThreshold: 'critical' | 'high' | 'medium' | 'low';
  failOnOutdated: boolean;
  outdatedThreshold: number;
  cache: boolean;
  token: string;
  workingDirectory: string;
  configPath: string;
  verbose: boolean;
}

/**
 * Get and validate action inputs
 */
export function getInputs(): ActionInputs {
  const workingDirectory = core.getInput('working-directory') || '.';

  const inputs: ActionInputs = {
    manifestPath: resolvePath(
      workingDirectory,
      core.getInput('manifest-path') || 'package.json'
    ),
    lockPath: core.getInput('lock-path')
      ? resolvePath(workingDirectory, core.getInput('lock-path'))
      : '',
    ecosystem: parseEcosystem(core.getInput('ecosystem') || 'npm'),
    mode: parseMode(core.getInput('mode') || 'resolve'),
    failOnVulnerabilities: core.getBooleanInput('fail-on-vulnerabilities'),
    vulnerabilityThreshold: parseThreshold(
      core.getInput('vulnerability-threshold') || 'high'
    ),
    failOnOutdated: core.getBooleanInput('fail-on-outdated'),
    outdatedThreshold: parseInt(core.getInput('outdated-threshold') || '10', 10),
    cache: core.getBooleanInput('cache'),
    token: core.getInput('token') || process.env.GITHUB_TOKEN || '',
    workingDirectory: path.resolve(workingDirectory),
    configPath: core.getInput('config-path')
      ? resolvePath(workingDirectory, core.getInput('config-path'))
      : '',
    verbose: core.getBooleanInput('verbose'),
  };

  // Validate inputs
  validateInputs(inputs);

  // Set debug logging if verbose
  if (inputs.verbose) {
    core.info('Verbose logging enabled');
  }

  return inputs;
}

/**
 * Resolve a path relative to working directory
 */
function resolvePath(workingDir: string, filePath: string): string {
  return path.resolve(workingDir, filePath);
}

/**
 * Parse ecosystem input
 */
function parseEcosystem(
  value: string
): 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'pip' | 'go' {
  const ecosystems = ['npm', 'yarn', 'pnpm', 'cargo', 'pip', 'go'] as const;
  const normalized = value.toLowerCase();

  if (ecosystems.includes(normalized as typeof ecosystems[number])) {
    return normalized as typeof ecosystems[number];
  }

  throw new Error(
    `Invalid ecosystem: ${value}. Must be one of: ${ecosystems.join(', ')}`
  );
}

/**
 * Parse mode input
 */
function parseMode(value: string): 'resolve' | 'analyze' | 'benchmark' {
  const modes = ['resolve', 'analyze', 'benchmark'] as const;
  const normalized = value.toLowerCase();

  if (modes.includes(normalized as typeof modes[number])) {
    return normalized as typeof modes[number];
  }

  throw new Error(`Invalid mode: ${value}. Must be one of: ${modes.join(', ')}`);
}

/**
 * Parse vulnerability threshold
 */
function parseThreshold(value: string): 'critical' | 'high' | 'medium' | 'low' {
  const thresholds = ['critical', 'high', 'medium', 'low'] as const;
  const normalized = value.toLowerCase();

  if (thresholds.includes(normalized as typeof thresholds[number])) {
    return normalized as typeof thresholds[number];
  }

  throw new Error(
    `Invalid threshold: ${value}. Must be one of: ${thresholds.join(', ')}`
  );
}

/**
 * Validate all inputs
 */
function validateInputs(inputs: ActionInputs): void {
  // Validate outdated threshold
  if (inputs.outdatedThreshold < 0) {
    throw new Error('outdated-threshold must be a non-negative number');
  }

  // Log configuration
  core.debug(`Manifest path: ${inputs.manifestPath}`);
  core.debug(`Ecosystem: ${inputs.ecosystem}`);
  core.debug(`Mode: ${inputs.mode}`);
  core.debug(`Cache enabled: ${inputs.cache}`);
}
