/**
 * @qadr/cli - Resolve Command
 *
 * Resolves dependencies using quantum-inspired annealing.
 */

import type { Command } from 'commander';
import type { ResolveOptions } from '../types.js';
import { createContext, handleError } from '../utils/index.js';

export function registerResolveCommand(program: Command): void {
  program
    .command('resolve')
    .description('Resolve dependencies using quantum annealing')
    .argument('[manifest]', 'Path to package.json (default: ./package.json)')
    .option('-e, --ecosystem <type>', 'Target ecosystem (npm, pip, cargo, maven)', 'npm')
    .option('--dry-run', 'Print resolved versions without writing lockfile')
    .option('--timeout <seconds>', 'Maximum resolution time in seconds', '60')
    .option('--dev', 'Include dev dependencies')
    .option('--parallel-tempering', 'Use parallel tempering instead of simulated annealing')
    .action(async (manifest: string | undefined, options: ResolveOptions, command: Command) => {
      const globalOptions = command.optsWithGlobals();
      try {
        await resolveCommand(manifest ?? 'package.json', { ...globalOptions, ...options });
      } catch (error) {
        const ctx = await createContext(globalOptions);
        handleError(error, ctx.logger);
      }
    });
}

async function resolveCommand(manifestPath: string, options: ResolveOptions): Promise<void> {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const { QUBOResolver } = await import('@qadr/core');

  const absPath = resolve(process.cwd(), manifestPath);

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(absPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    console.error(`Error: cannot read ${absPath}`);
    process.exit(1);
  }

  const deps = raw['dependencies'] as Record<string, string> | undefined ?? {};
  const devDeps = raw['devDependencies'] as Record<string, string> | undefined ?? {};

  const rootDeps = Object.entries(deps).map(([name, constraint]) => ({ name, constraint }));
  const rootDevDeps = Object.entries(devDeps).map(([name, constraint]) => ({ name, constraint }));

  const resolver = new QUBOResolver({
    ecosystem: (options.ecosystem as 'npm' | 'pip' | 'cargo' | 'maven') ?? 'npm',
    includeDevDeps: options.dev ?? false,
    maxTimeSeconds: options.timeout ? Number(options.timeout) : 60,
    useParallelTempering: false,
    onProgress: (p) => {
      if (!options['quiet']) {
        process.stdout.write(`\r  [${p.phase}] ${p.message}`.padEnd(60));
      }
    },
  });

  console.log(`\nResolving ${Object.keys(deps).length} direct dependencies from ${manifestPath}...`);

  const result = await resolver.resolve({
    name: (raw['name'] as string) ?? 'project',
    dependencies: rootDeps,
    devDependencies: rootDevDeps,
  });

  process.stdout.write('\n');

  if (result.error) {
    console.error(`\nError: ${result.error}`);
    process.exit(1);
  }

  const violated = result.violations.length;
  console.log(`\nResolved ${result.packages.length} packages, ${violated} violations`);
  console.log('');

  if (result.packages.length > 0) {
    const maxLen = Math.max(...result.packages.map((p) => `${p.name}@${p.version}`.length));
    for (const pkg of result.packages) {
      const label = `${pkg.name}@${pkg.version}`;
      console.log(`  ${label.padEnd(maxLen)}`);
    }
  }

  if (violated > 0) {
    console.log('\nViolations:');
    for (const v of result.violations) {
      console.log(`  [${v.type}] ${v.message}`);
    }
  }

  const stats = result.stats;
  console.log(`\nStats: ${stats.iterations} iterations, energy=${stats.finalEnergy.toFixed(2)}, ${stats.timeMs}ms`);

  if (result.success) {
    console.log('\n✓ Resolution successful');
  } else {
    console.log('\n⚠ Resolution completed with violations');
    if (!options.dryRun) process.exit(1);
  }
}
