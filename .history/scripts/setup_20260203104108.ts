#!/usr/bin/env tsx
/**
 * QADR Development Environment Setup
 *
 * This script:
 * 1. Checks prerequisites (Node.js, pnpm)
 * 2. Installs dependencies
 * 3. Builds all packages
 * 4. Runs initial tests
 *
 * @packageDocumentation
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string): void {
  log(`✓ ${message}`, colors.green);
}

function warn(message: string): void {
  log(`⚠ ${message}`, colors.yellow);
}

function error(message: string): void {
  log(`✗ ${message}`, colors.red);
}

function header(message: string): void {
  console.log();
  log(`━━━ ${message} ━━━`, colors.cyan + colors.bright);
  console.log();
}

function run(command: string, options: { cwd?: string; silent?: boolean } = {}): string {
  try {
    return execSync(command, {
      cwd: options.cwd ?? process.cwd(),
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    });
  } catch (err) {
    throw new Error(`Command failed: ${command}`);
  }
}

function checkNode(): void {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);

  if (major < 18) {
    error(`Node.js 18+ required. Found: ${nodeVersion}`);
    process.exit(1);
  }

  success(`Node.js ${nodeVersion}`);
}

function checkPnpm(): void {
  try {
    const version = run('pnpm --version', { silent: true }).trim();
    success(`pnpm ${version}`);
  } catch {
    error('pnpm not found. Install with: npm install -g pnpm');
    process.exit(1);
  }
}

function installDependencies(): void {
  log('Installing dependencies...');
  run('pnpm install');
  success('Dependencies installed');
}

function buildPackages(): void {
  log('Building packages...');
  run('pnpm build');
  success('Packages built');
}

function runTests(): void {
  log('Running tests...');
  try {
    run('pnpm test');
    success('All tests passed');
  } catch {
    warn('Some tests failed - check output above');
  }
}

function checkGit(): void {
  try {
    run('git status', { silent: true });
    success('Git repository detected');
  } catch {
    warn('Not a git repository');
  }
}

function setupGitHooks(): void {
  const huskyDir = path.join(process.cwd(), '.husky');

  if (fs.existsSync(huskyDir)) {
    log('Setting up git hooks...');
    try {
      run('npx husky install');
      success('Git hooks configured');
    } catch {
      warn('Could not set up git hooks');
    }
  }
}

async function main(): Promise<void> {
  console.log();
  log('🔮 QADR Development Setup', colors.bright + colors.cyan);
  console.log();

  header('Checking Prerequisites');
  checkNode();
  checkPnpm();
  checkGit();

  header('Installing Dependencies');
  installDependencies();

  header('Building Packages');
  buildPackages();

  header('Setting Up Git Hooks');
  setupGitHooks();

  header('Running Tests');
  runTests();

  console.log();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  success('Setup complete!');
  console.log();
  log('Next steps:', colors.bright);
  log('  • pnpm dev        Start development');
  log('  • pnpm test       Run tests');
  log('  • pnpm build      Build packages');
  console.log();
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
