/**
 * npm Ecosystem Adapter Example
 *
 * This example demonstrates using QADR with npm packages.
 */

import { adapters, createResolver } from '@qadr/core';

async function main() {
  // Create resolver with npm adapter
  const resolver = createResolver({
    ecosystem: 'npm',
    adapter: adapters.npm({
      registry: 'https://registry.npmjs.org',
      // Optional: use a cache
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        path: '.qadr-cache/npm',
      },
    }),
  });

  const dependencies = {
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    next: '^14.0.0',
  };

  console.log('📦 Resolving npm dependencies...\n');

  const result = await resolver.resolve(dependencies);

  if (result.success) {
    console.log('✅ Resolved!\n');

    // Group by scope
    const scoped: Record<string, string[]> = {};
    const unscoped: string[] = [];

    for (const [name, version] of Object.entries(result.versions)) {
      if (name.startsWith('@')) {
        const scope = name.split('/')[0];
        scoped[scope] = scoped[scope] || [];
        scoped[scope].push(`${name}@${version}`);
      } else {
        unscoped.push(`${name}@${version}`);
      }
    }

    console.log('Unscoped packages:', unscoped.length);
    for (const [scope, packages] of Object.entries(scoped)) {
      console.log(`${scope} packages:`, packages.length);
    }

    console.log(`\nTotal: ${Object.keys(result.versions).length} packages`);
  }
}

main().catch(console.error);
