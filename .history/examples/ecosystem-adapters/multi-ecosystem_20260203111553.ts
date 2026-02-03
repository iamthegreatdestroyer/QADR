/**
 * Multi-Ecosystem Resolution Example
 *
 * This example shows how to resolve dependencies across
 * multiple ecosystems simultaneously.
 */

import { adapters, createMultiResolver } from '@qadr/core';

async function main() {
  // Create a multi-ecosystem resolver
  const resolver = createMultiResolver({
    ecosystems: {
      npm: adapters.npm(),
      pip: adapters.pip(),
    },
  });

  // Dependencies from different ecosystems
  const dependencies = {
    npm: {
      typescript: '^5.0.0',
      eslint: '^8.0.0',
    },
    pip: {
      black: '>=23.0.0',
      mypy: '>=1.0.0',
    },
  };

  console.log('🌐 Resolving multi-ecosystem dependencies...\n');

  const result = await resolver.resolveAll(dependencies);

  if (result.success) {
    console.log('✅ All ecosystems resolved!\n');

    for (const [ecosystem, resolution] of Object.entries(result.ecosystems)) {
      console.log(`${ecosystem.toUpperCase()}:`);
      for (const [name, version] of Object.entries(resolution.versions)) {
        console.log(`  ${name}: ${version}`);
      }
      console.log();
    }

    console.log('Timing summary:');
    for (const [ecosystem, resolution] of Object.entries(result.ecosystems)) {
      console.log(`  ${ecosystem}: ${resolution.timing.total}ms`);
    }
    console.log(`  Total: ${result.timing.total}ms`);
  }
}

main().catch(console.error);
