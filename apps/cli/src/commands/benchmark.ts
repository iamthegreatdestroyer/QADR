/**
 * @qadr/cli - Benchmark Command
 */

import type { Command } from 'commander';

export function registerBenchmarkCommand(program: Command): void {
  program
    .command('benchmark')
    .description('Benchmark resolution performance')
    .option('-i, --iterations <count>', 'Number of benchmark iterations', '10')
    .option('-w, --warmup <count>', 'Number of warmup iterations', '3')
    .option('--suite <name>', 'Benchmark suite to run (small, medium, large, all)', 'all')
    .action(async () => {
      console.log('Benchmarking not yet implemented.');
    });
}
