#!/usr/bin/env node
/**
 * @qadr/cli - CLI Entry Point
 *
 * Main entry point for the QADR command-line interface.
 * Provides commands for dependency resolution, analysis, and benchmarking.
 *
 * @packageDocumentation
 */

import { Command } from 'commander';
import { createRequire } from 'node:module';
import {
  registerResolveCommand,
  registerAnalyzeCommand,
  registerBenchmarkCommand,
  registerConfigCommand,
} from '../commands/index.js';
import { handleError, disableColors } from '../utils/index.js';

// Load package.json for version
const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string; name: string; description: string };

/**
 * ASCII art banner
 */
const BANNER = `
  ██████   █████  ██████  ██████  
 ██    ██ ██   ██ ██   ██ ██   ██ 
 ██    ██ ███████ ██   ██ ██████  
 ██ ▄▄ ██ ██   ██ ██   ██ ██   ██ 
  ██████  ██   ██ ██████  ██   ██ 
     ▀▀                           
  Quantum-Annealed Dependency Resolution
`;

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('qadr')
    .description(pkg.description)
    .version(pkg.version, '-v, --version', 'Display version number')
    .option('-d, --debug', 'Enable debug mode')
    .option('-q, --quiet', 'Suppress output')
    .option('--no-color', 'Disable colored output')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--cwd <path>', 'Set working directory')
    .option('-f, --format <format>', 'Output format (json, yaml, table)', 'table')
    .hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();
      
      // Handle color setting
      if (options.noColor || process.env.NO_COLOR) {
        disableColors();
      }

      // Handle debug mode
      if (options.debug) {
        process.env.DEBUG = 'qadr:*';
      }
    });

  // Register all commands
  registerResolveCommand(program);
  registerAnalyzeCommand(program);
  registerBenchmarkCommand(program);
  registerConfigCommand(program);

  // Add some additional utility commands
  program
    .command('version')
    .description('Display detailed version information')
    .action(async () => {
      console.log(BANNER);
      console.log(`  Version: ${pkg.version}`);
      console.log(`  Node.js: ${process.version}`);
      console.log(`  Platform: ${process.platform} ${process.arch}`);
      console.log('');
    });

  program
    .command('doctor')
    .description('Check QADR installation and dependencies')
    .action(async () => {
      console.log(BANNER);
      await runDoctor();
    });

  return program;
}

/**
 * Run the doctor command to check installation
 */
async function runDoctor(): Promise<void> {
  const { success, warning, error, info, section } = await import('../utils/index.js');

  console.log(section('Environment'));
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log('');

  console.log(section('Package Managers'));
  
  const managers = ['npm', 'yarn', 'pnpm', 'bun'];
  for (const manager of managers) {
    try {
      const { execSync } = await import('node:child_process');
      const version = execSync(`${manager} --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      console.log(`  ${success('')} ${manager}: ${version}`);
    } catch {
      console.log(`  ${warning('')} ${manager}: not installed`);
    }
  }
  console.log('');

  console.log(section('Configuration'));
  try {
    const { loadConfig } = await import('@qadr/config');
    const config = await loadConfig();
    
    if (config.sources.file) {
      console.log(`  ${success('')} Configuration file: ${config.sources.file}`);
    } else {
      console.log(`  ${info('')} Using default configuration`);
    }
  } catch (err) {
    console.log(`  ${error('')} Failed to load configuration`);
    if (err instanceof Error) {
      console.log(`     ${err.message}`);
    }
  }
  console.log('');

  console.log(section('Dependencies'));
  console.log(`  ${success('')} @qadr/core: ready`);
  console.log(`  ${success('')} @qadr/semver: ready`);
  console.log(`  ${success('')} @qadr/shared: ready`);
  console.log(`  ${success('')} @qadr/config: ready`);
  console.log('');

  console.log(`${success('QADR is ready to use!')}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    handleError(err, console);
    process.exit(1);
  }
}

// Run main
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
