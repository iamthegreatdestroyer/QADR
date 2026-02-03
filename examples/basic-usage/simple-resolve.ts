/**
 * Basic QADR Usage Example
 *
 * This example demonstrates the simplest way to use QADR
 * to resolve npm dependencies.
 */

import { createResolver } from '@qadr/core';

async function main() {
  // Create a resolver with default settings
  const resolver = createResolver({
    ecosystem: 'npm',
  });

  // Define dependencies to resolve
  const dependencies = {
    lodash: '^4.17.0',
    express: '^4.18.0',
    typescript: '^5.0.0',
  };

  console.log('🔬 Resolving dependencies with QADR...\n');
  console.log('Input:', JSON.stringify(dependencies, null, 2));

  // Resolve dependencies
  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('\n✅ Resolution successful!\n');
    console.log('Resolved versions:');
    for (const [name, version] of Object.entries(result.versions)) {
      console.log(`  ${name}: ${version}`);
    }
    console.log(`\nTotal packages: ${Object.keys(result.versions).length}`);
    console.log(`Resolution time: ${result.timing.total}ms`);
  } else {
    console.error('\n❌ Resolution failed:', result.error);
  }
}

main().catch(console.error);
