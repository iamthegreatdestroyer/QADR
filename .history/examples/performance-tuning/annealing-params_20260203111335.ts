/**
 * Annealing Parameters Tuning Example
 *
 * This example shows how to tune simulated annealing
 * parameters for different workload characteristics.
 */

import { createResolver, AnnealingConfig } from '@qadr/core';

// Different configurations for different scenarios
const configs: Record<string, AnnealingConfig> = {
  // Fast resolution for small graphs
  fast: {
    initialTemperature: 100,
    finalTemperature: 0.1,
    coolingSchedule: 'exponential',
    coolingRate: 0.95,
    maxIterations: 1000,
    stepsPerTemperature: 10,
  },

  // Thorough resolution for large/complex graphs
  thorough: {
    initialTemperature: 1000,
    finalTemperature: 0.001,
    coolingSchedule: 'linear',
    coolingRate: 0.99,
    maxIterations: 50000,
    stepsPerTemperature: 100,
  },

  // Adaptive resolution that adjusts based on progress
  adaptive: {
    initialTemperature: 500,
    finalTemperature: 0.01,
    coolingSchedule: 'adaptive',
    adaptiveParams: {
      acceptanceTarget: 0.5,
      adjustmentRate: 0.1,
    },
    maxIterations: 10000,
    stepsPerTemperature: 50,
  },
};

async function main() {
  const dependencies = {
    lodash: '^4.17.0',
    express: '^4.18.0',
    axios: '^1.0.0',
  };

  console.log('🔧 Comparing annealing configurations...\n');

  for (const [name, config] of Object.entries(configs)) {
    const resolver = createResolver({
      ecosystem: 'npm',
      annealing: config,
    });

    console.log(`Configuration: ${name.toUpperCase()}`);
    console.log(`  Initial T: ${config.initialTemperature}`);
    console.log(`  Final T: ${config.finalTemperature}`);
    console.log(`  Schedule: ${config.coolingSchedule}`);
    console.log(`  Max iterations: ${config.maxIterations}`);

    const start = performance.now();
    const result = await resolver.resolve(dependencies);
    const elapsed = performance.now() - start;

    if (result.success) {
      console.log(`  ✅ Success in ${elapsed.toFixed(2)}ms`);
      console.log(`  Final energy: ${result.metrics.finalEnergy.toFixed(4)}`);
      console.log(`  Iterations used: ${result.metrics.iterations}`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
    console.log();
  }
}

main().catch(console.error);
