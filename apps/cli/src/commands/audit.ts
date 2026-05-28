/**
 * @qadr/cli - Audit Command
 *
 * Parses package-lock.json and reports version conflicts with QADR suggestions.
 */

import type { Command } from 'commander';

export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Audit package-lock.json for version conflicts and suggest resolutions')
    .argument('[lockfile]', 'Path to package-lock.json (default: ./package-lock.json)')
    .option('--json', 'Output results as JSON')
    .action(async (lockfile: string | undefined, options: { json?: boolean }) => {
      await auditCommand(lockfile ?? 'package-lock.json', options);
    });
}

interface LockfilePackage {
  version?: string;
  resolved?: string;
  integrity?: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, LockfilePackage>;
}

interface LockfileV1 {
  lockfileVersion: number;
  dependencies?: Record<string, LockfilePackage>;
  packages?: Record<string, LockfilePackage>;
}

interface ConflictReport {
  package: string;
  versions: string[];
  requiredBy: Array<{ package: string; requires: string }>;
  suggestion: string;
}

async function auditCommand(lockfilePath: string, options: { json?: boolean }): Promise<void> {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');

  const absPath = resolve(process.cwd(), lockfilePath);

  let lockfile: LockfileV1;
  try {
    lockfile = JSON.parse(await readFile(absPath, 'utf-8')) as LockfileV1;
  } catch {
    console.error(`Error: cannot read ${absPath}`);
    console.error('Run "npm install" first to generate a package-lock.json');
    process.exit(1);
  }

  // Collect all version occurrences per package name
  const versionMap = new Map<string, Map<string, string[]>>(); // pkg -> version -> [requiredBy]

  function crawl(deps: Record<string, LockfilePackage>, parent: string): void {
    for (const [name, entry] of Object.entries(deps)) {
      const version = entry.version ?? 'unknown';
      if (!versionMap.has(name)) versionMap.set(name, new Map());
      const vMap = versionMap.get(name)!;
      if (!vMap.has(version)) vMap.set(version, []);
      vMap.get(version)!.push(parent);

      if (entry.dependencies) {
        crawl(entry.dependencies, name);
      }
    }
  }

  // Support lockfile v1 (dependencies) and v2/v3 (packages)
  if (lockfile.dependencies) {
    crawl(lockfile.dependencies, '<root>');
  } else if (lockfile.packages) {
    for (const [path, entry] of Object.entries(lockfile.packages)) {
      if (!path) continue; // skip root ""
      const name = path.replace(/^node_modules\//, '').replace(/\/node_modules\/.*$/, '').split('/').pop() ?? path;
      const version = entry.version ?? 'unknown';
      if (!versionMap.has(name)) versionMap.set(name, new Map());
      const vMap = versionMap.get(name)!;
      if (!vMap.has(version)) vMap.set(version, []);
      vMap.get(version)!.push(path);
    }
  }

  // Find conflicts: packages with multiple versions
  const conflicts: ConflictReport[] = [];
  for (const [pkg, vMap] of versionMap) {
    if (vMap.size <= 1) continue;

    const versions = [...vMap.keys()].sort();
    const requiredBy: ConflictReport['requiredBy'] = [];
    for (const [version, parents] of vMap) {
      for (const parent of parents) {
        requiredBy.push({ package: parent, requires: version });
      }
    }

    // Suggest: pick the latest version as the resolution target
    const latest = versions[versions.length - 1] ?? versions[0] ?? 'unknown';
    conflicts.push({
      package: pkg,
      versions,
      requiredBy,
      suggestion: `QADR resolve would try: ${pkg}@${latest}`,
    });
  }

  if (options.json) {
    console.log(JSON.stringify({ lockfile: absPath, conflicts }, null, 2));
    return;
  }

  console.log(`\nAudit: ${absPath}`);
  console.log(`Found ${conflicts.length} version conflict(s)\n`);

  if (conflicts.length === 0) {
    console.log('✓ No version conflicts detected');
    return;
  }

  for (const conflict of conflicts) {
    console.log(`  ✗ ${conflict.package}`);
    console.log(`    Conflicting versions: ${conflict.versions.join(', ')}`);
    console.log('    Required by:');
    for (const req of conflict.requiredBy.slice(0, 5)) {
      console.log(`      ${req.package} → ${conflict.package}@${req.requires}`);
    }
    if (conflict.requiredBy.length > 5) {
      console.log(`      ... and ${conflict.requiredBy.length - 5} more`);
    }
    console.log(`    ${conflict.suggestion}`);
    console.log('');
  }

  console.log(`Run "qadr resolve package.json" to find an optimal resolution.`);
}
