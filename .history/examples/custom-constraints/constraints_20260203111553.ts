/**
 * Custom Constraints Example
 *
 * This example demonstrates how to add custom constraints
 * to the dependency resolution process.
 */

import { Constraint, createResolver } from '@qadr/core';

async function main() {
  // Define custom constraints
  const constraints: Constraint[] = [
    // Force a specific version
    {
      type: 'exact',
      package: 'lodash',
      version: '4.17.21',
      weight: 100, // High priority
    },

    // Exclude a version range
    {
      type: 'exclude',
      package: 'express',
      range: '<4.18.0',
      reason: 'Security vulnerability in older versions',
    },

    // Prefer newer versions
    {
      type: 'prefer',
      strategy: 'latest',
      weight: 10,
    },

    // Minimize total packages (reduce duplication)
    {
      type: 'minimize',
      target: 'packages',
      weight: 5,
    },
  ];

  const resolver = createResolver({
    ecosystem: 'npm',
    constraints,
  });

  const dependencies = {
    lodash: '^4.0.0',
    express: '^4.0.0',
    axios: '^1.0.0',
  };

  console.log('🎯 Resolving with custom constraints...\n');
  console.log('Constraints applied:');
  constraints.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.type}: ${JSON.stringify(c)}`);
  });
  console.log();

  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('✅ Resolution successful!\n');
    console.log('Resolved versions:');
    for (const [name, version] of Object.entries(result.versions)) {
      console.log(`  ${name}: ${version}`);
    }

    // Show constraint satisfaction
    console.log('\n📊 Constraint satisfaction:');
    console.log(`  lodash@4.17.21 forced: ${result.versions['lodash'] === '4.17.21' ? '✓' : '✗'}`);
    console.log(`  express>=4.18.0: ${parseFloat(result.versions['express']) >= 4.18 ? '✓' : '✗'}`);
  }
}

main().catch(console.error);
