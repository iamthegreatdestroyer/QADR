#!/usr/bin/env tsx
/**
 * QADR Release Script
 *
 * This script:
 * 1. Runs changeset version to update versions
 * 2. Builds all packages
 * 3. Runs tests
 * 4. Publishes to npm
 *
 * @packageDocumentation
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ANSI colors
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

function run(command: string, options: { silent?: boolean } = {}): string {
  try {
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    });
  } catch (err) {
    throw new Error(`Command failed: ${command}`);
  }
}

function checkCleanWorkingDirectory(): void {
  const status = run('git status --porcelain', { silent: true });

  if (status.trim()) {
    error('Working directory is not clean. Commit or stash changes first.');
    process.exit(1);
  }

  success('Working directory is clean');
}

function checkNpmAuth(): void {
  try {
    run('npm whoami', { silent: true });
    success('npm authenticated');
  } catch {
    error('Not authenticated with npm. Run: npm login');
    process.exit(1);
  }
}

function getPackages(): string[] {
  const packagesDir = path.join(process.cwd(), 'packages');
  const packages: string[] = [];

  if (fs.existsSync(packagesDir)) {
    for (const dir of fs.readdirSync(packagesDir)) {
      const pkgPath = path.join(packagesDir, dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (!pkg.private) {
          packages.push(pkg.name);
        }
      }
    }
  }

  return packages;
}

function runChangesetVersion(): void {
  log('Running changeset version...');
  run('npx changeset version');
  success('Versions updated');
}

function buildPackages(): void {
  log('Building packages...');
  run('pnpm build');
  success('Packages built');
}

function runTests(): void {
  log('Running tests...');
  run('pnpm test');
  success('All tests passed');
}

function runLint(): void {
  log('Running linter...');
  run('pnpm lint');
  success('Lint passed');
}

function publishPackages(): void {
  log('Publishing packages...');
  run('npx changeset publish');
  success('Packages published');
}

function pushTags(): void {
  log('Pushing tags...');
  run('git push --follow-tags');
  success('Tags pushed');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log();
  log('🔮 QADR Release', colors.bright + colors.cyan);
  if (dryRun) {
    warn('Dry run mode - no changes will be published');
  }
  console.log();

  header('Pre-flight Checks');
  checkCleanWorkingDirectory();
  if (!dryRun) {
    checkNpmAuth();
  }

  const packages = getPackages();
  log(`Found ${packages.length} packages to publish:`);
  for (const pkg of packages) {
    log(`  • ${pkg}`);
  }

  header('Updating Versions');
  runChangesetVersion();

  header('Building');
  buildPackages();

  header('Testing');
  runTests();

  header('Linting');
  runLint();

  if (dryRun) {
    header('Dry Run Complete');
    warn('Skipping publish in dry run mode');
    return;
  }

  header('Publishing');
  publishPackages();

  header('Pushing Tags');
  pushTags();

  console.log();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  success('Release complete!');
  console.log();
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
