/**
 * GitHub Actions Integration Example
 *
 * This example shows how to use QADR in a CI/CD pipeline
 * to validate and optimize dependencies.
 */

import { createResolver } from '@qadr/core';
import { readFile } from 'node:fs/promises';

interface CIResult {
  success: boolean;
  hasChanges: boolean;
  before: Record<string, string>;
  after: Record<string, string>;
  diff: { added: string[]; removed: string[]; updated: string[] };
}

async function runCICheck(): Promise<CIResult> {
  // Read current lock file
  const lockPath = 'package-lock.json';
  let currentVersions: Record<string, string> = {};

  try {
    const lockContent = await readFile(lockPath, 'utf-8');
    const lock = JSON.parse(lockContent);
    currentVersions = extractVersionsFromLock(lock);
  } catch {
    console.log('No existing lock file found, starting fresh');
  }

  // Read package.json
  const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Resolve with QADR
  const resolver = createResolver({
    ecosystem: 'npm',
    constraints: [
      {
        type: 'prefer',
        strategy: 'latest',
        weight: 5,
      },
      {
        type: 'minimize',
        target: 'packages',
        weight: 10,
      },
    ],
  });

  const result = await resolver.resolve(dependencies);

  if (!result.success) {
    throw new Error(`Resolution failed: ${result.error}`);
  }

  // Compare versions
  const diff = compareVersions(currentVersions, result.versions);

  return {
    success: true,
    hasChanges: diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0,
    before: currentVersions,
    after: result.versions,
    diff,
  };
}

function extractVersionsFromLock(lock: any): Record<string, string> {
  const versions: Record<string, string> = {};
  // Simplified extraction - real implementation would be more thorough
  if (lock.packages) {
    for (const [path, pkg] of Object.entries(lock.packages)) {
      if (path && (pkg as any).version) {
        const name = path.replace(/^node_modules\//, '');
        versions[name] = (pkg as any).version;
      }
    }
  }
  return versions;
}

function compareVersions(
  before: Record<string, string>,
  after: Record<string, string>
): { added: string[]; removed: string[]; updated: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];

  for (const name of Object.keys(after)) {
    if (!(name in before)) {
      added.push(`${name}@${after[name]}`);
    } else if (before[name] !== after[name]) {
      updated.push(`${name}: ${before[name]} → ${after[name]}`);
    }
  }

  for (const name of Object.keys(before)) {
    if (!(name in after)) {
      removed.push(`${name}@${before[name]}`);
    }
  }

  return { added, removed, updated };
}

async function main() {
  console.log('🔄 Running QADR CI Check...\n');

  try {
    const result = await runCICheck();

    if (result.hasChanges) {
      console.log('📝 Dependency changes detected:\n');

      if (result.diff.added.length > 0) {
        console.log('Added:');
        result.diff.added.forEach((p) => console.log(`  + ${p}`));
      }

      if (result.diff.removed.length > 0) {
        console.log('\nRemoved:');
        result.diff.removed.forEach((p) => console.log(`  - ${p}`));
      }

      if (result.diff.updated.length > 0) {
        console.log('\nUpdated:');
        result.diff.updated.forEach((p) => console.log(`  ~ ${p}`));
      }

      // In CI, you might want to fail if there are changes
      // process.exit(1);
    } else {
      console.log('✅ No dependency changes needed');
    }
  } catch (error) {
    console.error('❌ CI check failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
