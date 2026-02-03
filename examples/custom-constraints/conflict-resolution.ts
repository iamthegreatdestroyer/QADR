/**
 * Conflict Resolution Example
 *
 * This example shows how QADR handles conflicting
 * version requirements (diamond dependencies).
 */

import { createResolver } from '@qadr/core';

async function main() {
  const resolver = createResolver({
    ecosystem: 'npm',
    // Enable detailed logging for conflict resolution
    logging: {
      level: 'debug',
      showConflicts: true,
    },
  });

  // Simulated diamond dependency scenario:
  // app depends on pkg-a and pkg-b
  // pkg-a depends on shared@^1.0.0
  // pkg-b depends on shared@^2.0.0
  const dependencies = {
    'pkg-a': '^1.0.0', // wants shared@^1.0.0
    'pkg-b': '^1.0.0', // wants shared@^2.0.0
  };

  console.log('💎 Resolving diamond dependency conflict...\n');
  console.log('Scenario:');
  console.log('  pkg-a@1.0.0 → shared@^1.0.0');
  console.log('  pkg-b@1.0.0 → shared@^2.0.0');
  console.log();

  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('✅ Conflict resolved!\n');
    console.log('Solution:');
    for (const [name, version] of Object.entries(result.versions)) {
      console.log(`  ${name}: ${version}`);
    }

    if (result.conflicts?.length > 0) {
      console.log('\n⚠️ Resolved conflicts:');
      for (const conflict of result.conflicts) {
        console.log(`  ${conflict.package}: ${conflict.requested} → ${conflict.resolved}`);
        console.log(`    Reason: ${conflict.reason}`);
      }
    }
  } else {
    console.error('❌ Could not resolve conflicts:', result.error);

    if (result.unresolvedConflicts) {
      console.log('\n🔍 Unresolved conflicts:');
      for (const conflict of result.unresolvedConflicts) {
        console.log(`  ${conflict.package}:`);
        for (const req of conflict.requirements) {
          console.log(`    - ${req.from} wants ${req.range}`);
        }
      }
    }
  }
}

main().catch(console.error);
