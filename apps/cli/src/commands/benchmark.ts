/**
 * @qadr/cli - Benchmark Command
 *
 * Command for benchmarking resolution performance.
 *
 * @packageDocumentation
 */

import type { Command } from 'commander';
import type { BenchmarkOptions, BenchmarkResult } from '../types.js';
import {
  createContext,
  handleError,
  formatBenchmarkResults,
  formatDuration,
  formatBytes,
  header,
  section,
  success,
  info,
  PhaseSpinner,
} from '../utils/index.js';

/**
 * Register the benchmark command
 */
export function registerBenchmarkCommand(program: Command): void {
  program
    .command('benchmark')
    .description('Benchmark resolution performance')
    .option('-i, --iterations <count>', 'Number of benchmark iterations', parseInt, 10)
    .option('-w, --warmup <count>', 'Number of warmup iterations', parseInt, 3)
    .option('--compare', 'Compare with other resolvers')
    .option('--memory', 'Include memory profiling')
    .option('--cpu', 'Include CPU profiling')
    .option('--suite <name>', 'Benchmark suite to run (small, medium, large, all)')
    .option('-o, --output <path>', 'Output file path')
    .option('--export <path>', 'Export benchmark results as JSON')
    .action(async (options: BenchmarkOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals();
      
      try {
        await benchmarkCommand({ ...globalOptions, ...options });
      } catch (error) {
        const ctx = await createContext(globalOptions);
        handleError(error, ctx.logger);
      }
    });
}

/**
 * Execute the benchmark command
 */
async function benchmarkCommand(options: BenchmarkOptions): Promise<void> {
  const ctx = await createContext(options);
  const { logger } = ctx;

  const iterations = options.iterations ?? 10;
  const warmup = options.warmup ?? 3;
  const suite = options.suite ?? 'all';

  console.log(header('QADR Benchmark Suite'));
  console.log(info(`Iterations: ${iterations}, Warmup: ${warmup}`));
  console.log('');

  // Define benchmark suites
  const suites: Record<string, BenchmarkSuite[]> = {
    small: [
      { name: 'Small Project (10 deps)', deps: 10, transitive: 50 },
      { name: 'Small with Conflicts', deps: 10, transitive: 50, conflicts: 5 },
    ],
    medium: [
      { name: 'Medium Project (50 deps)', deps: 50, transitive: 200 },
      { name: 'Medium with Conflicts', deps: 50, transitive: 200, conflicts: 20 },
    ],
    large: [
      { name: 'Large Project (200 deps)', deps: 200, transitive: 1000 },
      { name: 'Large with Conflicts', deps: 200, transitive: 1000, conflicts: 100 },
      { name: 'Massive Project (500 deps)', deps: 500, transitive: 3000 },
    ],
  };

  const selectedSuites = suite === 'all'
    ? [...suites.small, ...suites.medium, ...suites.large]
    : suites[suite] ?? suites.small;

  const results: BenchmarkResult[] = [];

  // Run benchmarks
  const spinner = new PhaseSpinner(selectedSuites.map(s => s.name));
  spinner.start();

  for (let i = 0; i < selectedSuites.length; i++) {
    const benchSuite = selectedSuites[i];
    
    spinner.update(`Running: ${benchSuite.name}`);

    const result = await runBenchmark(benchSuite, iterations, warmup, {
      memory: options.memory,
      cpu: options.cpu,
    });

    results.push(result);

    if (i < selectedSuites.length - 1) {
      spinner.nextPhase();
    }
  }

  spinner.succeed('Benchmarks complete');

  // Display results
  console.log(section('Results'));
  console.log(formatBenchmarkResults(results));

  // Summary statistics
  console.log(section('Summary'));
  const totalTime = results.reduce((sum, r) => sum + r.meanMs, 0);
  const avgOpsPerSec = results.reduce((sum, r) => sum + r.opsPerSec, 0) / results.length;
  
  console.log(`  Total benchmark time: ${formatDuration(totalTime * iterations)}`);
  console.log(`  Average ops/sec:      ${avgOpsPerSec.toFixed(2)}`);

  if (options.memory) {
    const avgMemory = results.reduce((sum, r) => sum + (r.memoryBytes ?? 0), 0) / results.length;
    console.log(`  Average memory:       ${formatBytes(avgMemory)}`);
  }

  // Compare with other resolvers if requested
  if (options.compare) {
    console.log(section('Comparison with Other Resolvers'));
    await compareResolvers(selectedSuites[0], iterations, warmup);
  }

  // Export results
  if (options.export) {
    const { writeFile } = await import('node:fs/promises');
    const exportData = {
      timestamp: new Date().toISOString(),
      config: {
        iterations,
        warmup,
        suite,
      },
      results,
      system: await getSystemInfo(),
    };
    await writeFile(options.export, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(success(`\nResults exported to: ${options.export}`));
  }
}

// =============================================================================
// Types
// =============================================================================

interface BenchmarkSuite {
  name: string;
  deps: number;
  transitive: number;
  conflicts?: number;
}

interface BenchmarkStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function runBenchmark(
  suite: BenchmarkSuite,
  iterations: number,
  warmup: number,
  options: { memory?: boolean; cpu?: boolean },
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let memoryUsage: number | undefined;

  // Generate test data
  const testData = generateTestData(suite);

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await runResolution(testData);
  }

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  // Measure memory before
  const memBefore = options.memory ? process.memoryUsage().heapUsed : 0;

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await runResolution(testData);
    const end = performance.now();
    times.push(end - start);
  }

  // Measure memory after
  if (options.memory) {
    memoryUsage = process.memoryUsage().heapUsed - memBefore;
  }

  // Calculate statistics
  const stats = calculateStats(times);

  return {
    name: suite.name,
    iterations,
    meanMs: stats.mean,
    stdDevMs: stats.stdDev,
    minMs: stats.min,
    maxMs: stats.max,
    opsPerSec: 1000 / stats.mean,
    memoryBytes: memoryUsage,
  };
}

function generateTestData(suite: BenchmarkSuite): Record<string, unknown> {
  // TODO: Generate realistic test data based on suite parameters
  return {
    dependencies: Array.from({ length: suite.deps }, (_, i) => ({
      name: `package-${i}`,
      version: `^${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.0`,
    })),
    conflicts: suite.conflicts ?? 0,
  };
}

async function runResolution(_testData: Record<string, unknown>): Promise<void> {
  // TODO: Actually run @qadr/core resolution
  // Simulate work with realistic timing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
}

function calculateStats(values: number[]): BenchmarkStats {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, stdDev, min, max };
}

async function compareResolvers(
  _suite: BenchmarkSuite,
  _iterations: number,
  _warmup: number,
): Promise<void> {
  // TODO: Implement comparison with npm, yarn, pnpm
  console.log('  Comparison with other resolvers not yet implemented.');
  console.log('  Will compare with npm, yarn, and pnpm in future versions.');
}

async function getSystemInfo(): Promise<Record<string, unknown>> {
  const os = await import('node:os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: os.totalmem(),
    nodeVersion: process.version,
  };
}
