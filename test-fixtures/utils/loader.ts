/**
 * Test Fixture Loader
 *
 * Utility for loading test fixtures in ecosystem tests.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const FIXTURES_ROOT = join(__dirname, '..');

export interface Fixture {
  name: string;
  ecosystem: string;
  manifest: unknown;
  registrySnapshot: RegistrySnapshot;
  expected: Record<string, string>;
}

export interface RegistrySnapshot {
  packages: Record<string, Record<string, PackageVersion>>;
  expected: Record<string, string>;
}

export interface PackageVersion {
  name: string;
  version: string;
  dependencies: Record<string, string>;
}

/**
 * Load a test fixture by path.
 *
 * @param fixturePath - Path relative to test-fixtures/, e.g., 'npm/simple'
 * @returns Parsed fixture data
 */
export async function loadFixture(fixturePath: string): Promise<Fixture> {
  const [ecosystem, name] = fixturePath.split('/');
  const fixtureDir = join(FIXTURES_ROOT, ecosystem, name);

  // Load registry snapshot
  const snapshotPath = join(fixtureDir, 'registry-snapshot.json');
  const snapshotContent = await readFile(snapshotPath, 'utf-8');
  const registrySnapshot: RegistrySnapshot = JSON.parse(snapshotContent);

  // Load manifest based on ecosystem
  const manifest = await loadManifest(fixtureDir, ecosystem);

  return {
    name,
    ecosystem,
    manifest,
    registrySnapshot,
    expected: registrySnapshot.expected,
  };
}

async function loadManifest(fixtureDir: string, ecosystem: string): Promise<unknown> {
  switch (ecosystem) {
    case 'npm': {
      const content = await readFile(join(fixtureDir, 'package.json'), 'utf-8');
      return JSON.parse(content);
    }
    case 'pip': {
      const content = await readFile(join(fixtureDir, 'requirements.txt'), 'utf-8');
      return parseRequirementsTxt(content);
    }
    case 'cargo': {
      const content = await readFile(join(fixtureDir, 'Cargo.toml'), 'utf-8');
      return parseCargoToml(content);
    }
    case 'maven': {
      const content = await readFile(join(fixtureDir, 'pom.xml'), 'utf-8');
      return content; // XML parsing handled separately
    }
    default:
      throw new Error(`Unknown ecosystem: ${ecosystem}`);
  }
}

function parseRequirementsTxt(content: string): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Simple parsing - handles name>=version format
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)(.*)$/);
    if (match) {
      deps[match[1]] = match[2] || '*';
    }
  }
  return deps;
}

function parseCargoToml(content: string): Record<string, string> {
  const deps: Record<string, string> = {};
  let inDeps = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed === '[dependencies]') {
      inDeps = true;
      continue;
    }

    if (trimmed.startsWith('[') && inDeps) {
      inDeps = false;
      continue;
    }

    if (inDeps) {
      // Handle: name = "version" or name = { version = "x" }
      const simpleMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (simpleMatch) {
        deps[simpleMatch[1]] = simpleMatch[2];
        continue;
      }

      const tableMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
      if (tableMatch) {
        deps[tableMatch[1]] = tableMatch[2];
      }
    }
  }

  return deps;
}

/**
 * List all available fixtures.
 */
export async function listFixtures(): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');

  const ecosystems = await readdir(FIXTURES_ROOT);
  const fixtures: string[] = [];

  for (const ecosystem of ecosystems) {
    if (ecosystem === 'README.md' || ecosystem === 'utils' || ecosystem === 'generated') {
      continue;
    }

    const ecosystemDir = join(FIXTURES_ROOT, ecosystem);
    const names = await readdir(ecosystemDir);

    for (const name of names) {
      fixtures.push(`${ecosystem}/${name}`);
    }
  }

  return fixtures;
}

/**
 * Create a mock registry from a snapshot for testing.
 */
export function createMockRegistry(snapshot: RegistrySnapshot) {
  return {
    async getVersions(packageName: string): Promise<string[]> {
      const pkg = snapshot.packages[packageName];
      return pkg ? Object.keys(pkg) : [];
    },

    async getPackage(packageName: string, version: string): Promise<PackageVersion | null> {
      const pkg = snapshot.packages[packageName];
      return pkg?.[version] ?? null;
    },

    async getDependencies(packageName: string, version: string): Promise<Record<string, string>> {
      const pkg = await this.getPackage(packageName, version);
      return pkg?.dependencies ?? {};
    },
  };
}
