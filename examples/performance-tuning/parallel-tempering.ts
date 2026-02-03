/**
 * Parallel Tempering Example
 *
 * This example demonstrates using parallel tempering
 * for faster convergence on complex dependency graphs.
 */

import { createResolver } from '@qadr/core';

async function main() {
  // Large dependency set to benefit from parallel tempering
  const dependencies = {
    next: '^14.0.0',
    'react-query': '^5.0.0',
    'react-hook-form': '^7.0.0',
    zod: '^3.0.0',
    prisma: '^5.0.0',
    tailwindcss: '^3.0.0',
    typescript: '^5.0.0',
    eslint: '^8.0.0',
    prettier: '^3.0.0',
    vitest: '^1.0.0',
  };

  console.log('🌡️ Parallel Tempering vs Single Annealing Comparison\n');
  console.log(`Resolving ${Object.keys(dependencies).length} direct dependencies...\n`);

  // Single annealing baseline
  console.log('Standard Simulated Annealing:');
  const singleResolver = createResolver({
    ecosystem: 'npm',
    annealing: {
      type: 'simulated',
      initialTemperature: 500,
      coolingRate: 0.98,
      maxIterations: 10000,
    },
  });

  let start = performance.now();
  let result = await singleResolver.resolve(dependencies);
  let elapsed = performance.now() - start;

  if (result.success) {
    console.log(`  Time: ${elapsed.toFixed(2)}ms`);
    console.log(`  Packages: ${Object.keys(result.versions).length}`);
    console.log(`  Final energy: ${result.metrics.finalEnergy.toFixed(4)}`);
    console.log(`  Iterations: ${result.metrics.iterations}`);
  }

  console.log();

  // Parallel tempering
  console.log('Parallel Tempering:');
  const parallelResolver = createResolver({
    ecosystem: 'npm',
    annealing: {
      type: 'parallel-tempering',
      replicas: 8, // Number of parallel chains
      temperatures: [1000, 500, 250, 100, 50, 25, 10, 1],
      exchangeInterval: 50,
      maxIterations: 10000,
    },
  });

  start = performance.now();
  result = await parallelResolver.resolve(dependencies);
  elapsed = performance.now() - start;

  if (result.success) {
    console.log(`  Time: ${elapsed.toFixed(2)}ms`);
    console.log(`  Packages: ${Object.keys(result.versions).length}`);
    console.log(`  Final energy: ${result.metrics.finalEnergy.toFixed(4)}`);
    console.log(`  Iterations: ${result.metrics.iterations}`);
    console.log(`  Exchanges: ${result.metrics.exchanges}`);
    console.log(`  Exchange rate: ${(result.metrics.exchangeRate * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
