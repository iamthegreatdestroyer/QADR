#!/usr/bin/env tsx
/**
 * QADR Clean Script
 *
 * Removes all build artifacts, caches, and generated files.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
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

/**
 * Directories to clean
 */
const CLEAN_PATTERNS = [
  // Build outputs
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',

  // Caches
  'node_modules/.cache',
  '.turbo',
  '.eslintcache',
  '.qadr-cache',
  '.cache',

  // TypeScript
  '*.tsbuildinfo',
  'tsconfig.tsbuildinfo',

  // Test outputs
  'coverage',
  '.nyc_output',

  // Temporary
  'tmp',
  'temp',
];

/**
 * Find all matching paths in a directory
 */
function findPaths(baseDir: string, patterns: string[]): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules (except for .cache inside)
      if (entry.name === 'node_modules' && !patterns.includes('node_modules/.cache')) {
        continue;
      }

      // Check if this matches a pattern
      for (const pattern of patterns) {
        if (entry.name === pattern || fullPath.endsWith(pattern)) {
          results.push(fullPath);
        }
      }

      // Recurse into directories
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walk(fullPath);
      }
    }
  }

  walk(baseDir);
  return results;
}

/**
 * Remove a path (file or directory)
 */
function removePath(targetPath: string): void {
  if (!fs.existsSync(targetPath)) return;

  const stats = fs.statSync(targetPath);

  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Get size of path recursively
 */
function getSize(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;

  const stats = fs.statSync(targetPath);

  if (stats.isFile()) {
    return stats.size;
  }

  let size = 0;
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    size += getSize(path.join(targetPath, entry.name));
  }

  return size;
}

async function main(): Promise<void> {
  console.log();
  log('🧹 QADR Clean', colors.bright + colors.cyan);
  console.log();

  const rootDir = process.cwd();
  const pathsToClean = findPaths(rootDir, CLEAN_PATTERNS);

  if (pathsToClean.length === 0) {
    log('Nothing to clean');
    return;
  }

  let totalSize = 0;
  let cleaned = 0;

  log(`Found ${pathsToClean.length} items to clean:\n`);

  for (const targetPath of pathsToClean) {
    const relativePath = path.relative(rootDir, targetPath);
    const size = getSize(targetPath);

    try {
      removePath(targetPath);
      totalSize += size;
      cleaned++;
      success(`${relativePath} (${formatBytes(size)})`);
    } catch (err) {
      warn(`Failed to remove: ${relativePath}`);
    }
  }

  console.log();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  success(`Cleaned ${cleaned} items, freed ${formatBytes(totalSize)}`);
  console.log();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
