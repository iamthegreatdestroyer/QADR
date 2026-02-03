#!/usr/bin/env tsx
/**
 * QADR Benchmark Script
 *
 * Runs performance benchmarks comparing QADR against other package managers.
 *
 * @packageDocumentation
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string): void {
  console.log();
  log(`━━━ ${message} ━━━`, colors.cyan + colors.bright);
  console.log();
}

interface BenchmarkResult {
  name: string;
  times: number[];
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

interface BenchmarkConfig {
  name: string;
  manifest: Record<string, unknown>;
  iterations: number;
  warmup: number;
}

/**
 * Calculate statistics from array of numbers
 */
function calcStats(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const variance = values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
  };
}

/**
 * Run a benchmark for QADR
 */
async function benchmarkQADR(
  manifest: Record<string, unknown>,
  iterations: number,
  warmup: number
): Promise<BenchmarkResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qadr-bench-'));
  const manifestPath = path.join(tmpDir, 'package.json');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const times: number[] = [];

  // Warmup
  for (let i = 0; i < warmup; i++) {
    try {
      execSync(`npx qadr resolve --manifest ${manifestPath}`, {
        stdio: 'pipe',
        cwd: tmpDir,
      });
    } catch {
      // Ignore warmup errors
    }
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    // Clear cache
    try {
      execSync(`npx qadr cache clear`, { stdio: 'pipe', cwd: tmpDir });
    } catch {
      // Cache might not exist
    }

    const start = performance.now();

    try {
      execSync(`npx qadr resolve --manifest ${manifestPath} --no-cache`, {
        stdio: 'pipe',
        cwd: tmpDir,
      });
    } catch (err) {
      log(`Iteration ${i + 1} failed`, colors.yellow);
      continue;
    }

    const elapsed = performance.now() - start;
    times.push(elapsed);

    process.stdout.write('.');
  }

  console.log();

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const stats = calcStats(times);

  return {
    name: 'QADR',
    times,
    ...stats,
  };
}

/**
 * Run a benchmark for npm
 */
async function benchmarkNpm(
  manifest: Record<string, unknown>,
  iterations: number,
  warmup: number
): Promise<BenchmarkResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-bench-'));
  const manifestPath = path.join(tmpDir, 'package.json');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const times: number[] = [];

  // Warmup
  for (let i = 0; i < warmup; i++) {
    try {
      execSync('npm install --package-lock-only --ignore-scripts', {
        stdio: 'pipe',
        cwd: tmpDir,
      });
      fs.rmSync(path.join(tmpDir, 'package-lock.json'), { force: true });
    } catch {
      // Ignore
    }
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    // Clear npm cache
    try {
      execSync('npm cache clean --force', { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    // Remove lockfile
    try {
      fs.rmSync(path.join(tmpDir, 'package-lock.json'), { force: true });
    } catch {
      // Ignore
    }

    const start = performance.now();

    try {
      execSync('npm install --package-lock-only --ignore-scripts', {
        stdio: 'pipe',
        cwd: tmpDir,
      });
    } catch (err) {
      log(`Iteration ${i + 1} failed`, colors.yellow);
      continue;
    }

    const elapsed = performance.now() - start;
    times.push(elapsed);

    process.stdout.write('.');
  }

  console.log();

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const stats = calcStats(times);

  return {
    name: 'npm',
    times,
    ...stats,
  };
}

/**
 * Format milliseconds as human-readable string
 */
function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print benchmark results table
 */
function printResults(results: BenchmarkResult[]): void {
  const cols = {
    name: 'Tool',
    mean: 'Mean',
    median: 'Median',
    stdDev: 'Std Dev',
    min: 'Min',
    max: 'Max',
  };

  // Header
  console.log();
  log(
    `${'Tool'.padEnd(10)} ${'Mean'.padStart(10)} ${'Median'.padStart(10)} ${'Std Dev'.padStart(10)} ${'Min'.padStart(10)} ${'Max'.padStart(10)}`,
    colors.bright
  );
  log('─'.repeat(62));

  // Rows
  for (const result of results) {
    const row = [
      result.name.padEnd(10),
      formatMs(result.mean).padStart(10),
      formatMs(result.median).padStart(10),
      formatMs(result.stdDev).padStart(10),
      formatMs(result.min).padStart(10),
      formatMs(result.max).padStart(10),
    ].join(' ');

    log(row);
  }

  // Speedup
  if (results.length >= 2) {
    const qadr = results.find(r => r.name === 'QADR');
    const npm = results.find(r => r.name === 'npm');

    if (qadr && npm) {
      const speedup = npm.mean / qadr.mean;
      console.log();
      log(`QADR is ${colors.green}${speedup.toFixed(1)}x faster${colors.reset} than npm`);
    }
  }
}

/**
 * Test manifests of varying sizes
 */
const MANIFESTS = {
  small: {
    name: 'test-small',
    version: '1.0.0',
    dependencies: {
      lodash: '^4.17.0',
      axios: '^1.0.0',
      uuid: '^9.0.0',
    },
  },
  medium: {
    name: 'test-medium',
    version: '1.0.0',
    dependencies: {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      lodash: '^4.17.0',
      axios: '^1.0.0',
      moment: '^2.29.0',
      'date-fns': '^2.0.0',
      uuid: '^9.0.0',
      zod: '^3.0.0',
      express: '^4.0.0',
      'node-fetch': '^3.0.0',
    },
  },
  large: {
    name: 'test-large',
    version: '1.0.0',
    dependencies: {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'react-router-dom': '^6.0.0',
      redux: '^4.0.0',
      'react-redux': '^8.0.0',
      '@reduxjs/toolkit': '^1.0.0',
      lodash: '^4.17.0',
      axios: '^1.0.0',
      moment: '^2.29.0',
      'date-fns': '^2.0.0',
      uuid: '^9.0.0',
      zod: '^3.0.0',
      express: '^4.0.0',
      'node-fetch': '^3.0.0',
      'styled-components': '^6.0.0',
      'framer-motion': '^10.0.0',
      '@tanstack/react-query': '^4.0.0',
      swr: '^2.0.0',
      formik: '^2.0.0',
      yup: '^1.0.0',
    },
  },
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const size = (args[0] as keyof typeof MANIFESTS) || 'medium';
  const iterations = parseInt(args[1] || '5', 10);
  const warmup = parseInt(args[2] || '2', 10);

  console.log();
  log('📊 QADR Benchmark', colors.bright + colors.cyan);
  console.log();
  log(`Size: ${size}`);
  log(`Iterations: ${iterations}`);
  log(`Warmup: ${warmup}`);

  const manifest = MANIFESTS[size];

  if (!manifest) {
    log(`Unknown size: ${size}. Use: small, medium, large`, colors.red);
    process.exit(1);
  }

  header('Running QADR Benchmark');
  const qadrResult = await benchmarkQADR(manifest, iterations, warmup);

  header('Running npm Benchmark');
  const npmResult = await benchmarkNpm(manifest, iterations, warmup);

  header('Results');
  printResults([qadrResult, npmResult]);

  console.log();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
