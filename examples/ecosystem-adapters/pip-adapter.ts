/**
 * pip Ecosystem Adapter Example
 *
 * This example demonstrates using QADR with Python packages.
 */

import { adapters, createResolver } from '@qadr/core';

async function main() {
  // Create resolver with pip adapter
  const resolver = createResolver({
    ecosystem: 'pip',
    adapter: adapters.pip({
      index: 'https://pypi.org/simple',
      // Handle Python version constraints
      pythonVersion: '3.11',
    }),
  });

  // Python-style version constraints
  const dependencies = {
    django: '>=4.0,<5.0',
    requests: '>=2.28.0',
    numpy: '>=1.24.0',
  };

  console.log('🐍 Resolving pip dependencies...\n');

  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('✅ Resolved!\n');
    console.log('requirements.txt output:\n');

    // Generate requirements.txt format
    for (const [name, version] of Object.entries(result.versions)) {
      console.log(`${name}==${version}`);
    }

    console.log(`\n# Total: ${Object.keys(result.versions).length} packages`);
  }
}

main().catch(console.error);
