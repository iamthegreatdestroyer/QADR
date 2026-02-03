/**
 * File-based Resolution Example
 *
 * This example shows how to resolve dependencies from
 * a package.json file.
 */

import { createResolver } from '@qadr/core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  // Create resolver
  const resolver = createResolver({
    ecosystem: 'npm',
  });

  // Read package.json
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  console.log(
    `📦 Resolving ${Object.keys(dependencies).length} dependencies from package.json...\n`
  );

  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('✅ Resolution complete!\n');

    // Group by depth
    const direct = Object.keys(packageJson.dependencies || {}).length;
    const dev = Object.keys(packageJson.devDependencies || {}).length;
    const transitive = Object.keys(result.versions).length - direct - dev;

    console.log(`Direct dependencies: ${direct}`);
    console.log(`Dev dependencies: ${dev}`);
    console.log(`Transitive dependencies: ${transitive}`);
    console.log(`\nTotal: ${Object.keys(result.versions).length} packages`);

    // Show timing breakdown
    console.log('\n⏱️ Timing breakdown:');
    console.log(`  QUBO construction: ${result.timing.quboConstruction}ms`);
    console.log(`  Annealing: ${result.timing.annealing}ms`);
    console.log(`  Total: ${result.timing.total}ms`);
  } else {
    console.error('❌ Resolution failed:', result.error);
  }
}

main().catch(console.error);
