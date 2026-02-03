/**
 * npm ecosystem adapter.
 *
 * Translates between npm registry format and QADR dependency format.
 */

import type { IDependencySpec, IResolvedPackage } from '../types.js';
import type {
  IAdapterOptions,
  IEcosystemAdapter,
  ILockfile,
  ILockfileEntry,
  IManifest,
  IPackageMetadata,
  IVersionMetadata,
} from './types.js';

/**
 * npm registry package document format.
 */
interface INpmRegistryDocument {
  readonly name: string;
  readonly description?: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly repository?: { url?: string };
  readonly versions: Record<string, INpmVersionDocument>;
  readonly time?: Record<string, string>;
  readonly 'dist-tags'?: Record<string, string>;
}

/**
 * npm version document format.
 */
interface INpmVersionDocument {
  readonly version: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly deprecated?: string;
  readonly dist?: {
    readonly tarball?: string;
    readonly shasum?: string;
    readonly integrity?: string;
    readonly unpackedSize?: number;
  };
}

/**
 * npm package.json format.
 */
interface IPackageJson {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * npm package-lock.json format (v3).
 */
interface IPackageLockJson {
  readonly lockfileVersion: number;
  readonly packages: Record<string, IPackageLockEntry>;
}

interface IPackageLockEntry {
  readonly version?: string;
  readonly resolved?: string;
  readonly integrity?: string;
  readonly dependencies?: Record<string, string>;
}

/**
 * npm ecosystem adapter.
 */
export class NpmAdapter implements IEcosystemAdapter {
  public readonly name = 'npm';
  public readonly defaultRegistryUrl = 'https://registry.npmjs.org';

  /**
   * Fetch metadata for a single package.
   */
  public async fetchPackage(
    packageName: string,
    options?: IAdapterOptions
  ): Promise<IPackageMetadata | undefined> {
    const registryUrl = options?.registryUrl ?? this.defaultRegistryUrl;
    const normalizedName = this.normalizePackageName(packageName);

    // Check cache
    if (options?.cache?.has(normalizedName)) {
      return options.cache.get(normalizedName);
    }

    const url = `${registryUrl}/${encodeURIComponent(normalizedName)}`;

    try {
      const response = await this.fetchWithRetry(url, options);

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to fetch ${packageName}: ${response.status}`);
      }

      const doc: INpmRegistryDocument = await response.json();
      const metadata = this.transformRegistryDocument(doc);

      // Cache result
      options?.cache?.set(normalizedName, metadata);

      return metadata;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      console.error(`Failed to fetch ${packageName}:`, error);
      return undefined;
    }
  }

  /**
   * Fetch metadata for multiple packages in parallel.
   */
  public async fetchPackages(
    packageNames: readonly string[],
    options?: IAdapterOptions
  ): Promise<Map<string, IPackageMetadata>> {
    const results = new Map<string, IPackageMetadata>();

    // Fetch in parallel with concurrency limit
    const concurrency = 10;
    const chunks: string[][] = [];

    for (let i = 0; i < packageNames.length; i += concurrency) {
      chunks.push([...packageNames.slice(i, i + concurrency)]);
    }

    for (const chunk of chunks) {
      const promises = chunk.map((name) => this.fetchPackage(name, options));
      const metadatas = await Promise.all(promises);

      for (let i = 0; i < chunk.length; i++) {
        const name = chunk[i]!;
        const metadata = metadatas[i];
        if (metadata) {
          results.set(name, metadata);
        }
      }
    }

    return results;
  }

  /**
   * Parse a package.json file.
   */
  public parseManifest(content: string): IManifest {
    const pkg: IPackageJson = JSON.parse(content);

    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: this.parseDependencies(pkg.dependencies),
      devDependencies: this.parseDependencies(pkg.devDependencies),
      peerDependencies: this.parseDependencies(pkg.peerDependencies),
      optionalDependencies: this.parseDependencies(pkg.optionalDependencies),
      raw: pkg,
    };
  }

  /**
   * Generate a package.json file.
   */
  public generateManifest(manifest: IManifest): string {
    const pkg: Record<string, unknown> = {
      name: manifest.name,
      version: manifest.version,
    };

    if (manifest.dependencies.length > 0) {
      pkg['dependencies'] = this.serializeDependencies(manifest.dependencies);
    }

    if (manifest.devDependencies && manifest.devDependencies.length > 0) {
      pkg['devDependencies'] = this.serializeDependencies(manifest.devDependencies);
    }

    if (manifest.peerDependencies && manifest.peerDependencies.length > 0) {
      pkg['peerDependencies'] = this.serializeDependencies(manifest.peerDependencies);
    }

    if (manifest.optionalDependencies && manifest.optionalDependencies.length > 0) {
      pkg['optionalDependencies'] = this.serializeDependencies(manifest.optionalDependencies);
    }

    // Preserve other fields from raw
    if (manifest.raw && typeof manifest.raw === 'object') {
      const raw = manifest.raw as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        if (!(key in pkg)) {
          pkg[key] = raw[key];
        }
      }
    }

    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Parse a package-lock.json file.
   */
  public parseLockfile(content: string): ILockfile {
    const lock: IPackageLockJson = JSON.parse(content);

    const packages: ILockfileEntry[] = [];

    for (const [path, entry] of Object.entries(lock.packages)) {
      if (!path || !entry.version) continue;

      // Extract package name from path (e.g., "node_modules/@scope/pkg")
      const match = path.match(/node_modules\/(.+)$/);
      if (!match) continue;

      const name = match[1]!;

      packages.push({
        name,
        version: entry.version,
        integrity: entry.integrity ?? '',
        resolved: entry.resolved ?? '',
        dependencies: entry.dependencies,
      });
    }

    return {
      version: lock.lockfileVersion,
      packages,
    };
  }

  /**
   * Generate a package-lock.json file.
   */
  public generateLockfile(solution: readonly IResolvedPackage[]): string {
    const packages: Record<string, IPackageLockEntry> = {
      '': {
        version: '1.0.0',
      },
    };

    for (const pkg of solution) {
      const path = `node_modules/${pkg.name}`;
      packages[path] = {
        version: pkg.version,
        resolved: `https://registry.npmjs.org/${pkg.name}/-/${pkg.name}-${pkg.version}.tgz`,
        integrity: pkg.integrity ?? '',
      };
    }

    const lock: IPackageLockJson = {
      lockfileVersion: 3,
      packages,
    };

    return JSON.stringify(lock, null, 2);
  }

  /**
   * Validate a semver version string.
   */
  public isValidVersion(version: string): boolean {
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Validate a semver constraint.
   */
  public isValidConstraint(constraint: string): boolean {
    // Basic validation - npm supports many constraint formats
    const validPrefixes = ['^', '~', '>', '<', '>=', '<=', '=', '||', '-', '*', 'x'];
    if (constraint === '' || constraint === '*' || constraint === 'latest') {
      return true;
    }
    // Check if starts with valid prefix or is a valid version
    for (const prefix of validPrefixes) {
      if (constraint.startsWith(prefix)) {
        return true;
      }
    }
    return this.isValidVersion(constraint);
  }

  /**
   * Normalize a package name.
   */
  public normalizePackageName(packageName: string): string {
    // npm package names are case-insensitive
    return packageName.toLowerCase();
  }

  /**
   * Transform npm registry document to our format.
   */
  private transformRegistryDocument(doc: INpmRegistryDocument): IPackageMetadata {
    const versions: IVersionMetadata[] = [];

    // Sort versions newest first
    const versionKeys = Object.keys(doc.versions).sort((a, b) => {
      // Simple semver comparison (major.minor.patch)
      const partsA = a.split('.').map(Number);
      const partsB = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((partsA[i] ?? 0) !== (partsB[i] ?? 0)) {
          return (partsB[i] ?? 0) - (partsA[i] ?? 0);
        }
      }
      return 0;
    });

    for (const version of versionKeys) {
      const vDoc = doc.versions[version]!;

      versions.push({
        version: vDoc.version,
        dependencies: this.parseDependencies(vDoc.dependencies),
        devDependencies: this.parseDependencies(vDoc.devDependencies),
        peerDependencies: this.parseDependencies(vDoc.peerDependencies),
        optionalDependencies: this.parseDependencies(vDoc.optionalDependencies),
        deprecated: vDoc.deprecated !== undefined,
        publishedAt: doc.time?.[version] ? new Date(doc.time[version]!) : undefined,
        size: vDoc.dist?.unpackedSize,
        integrity: vDoc.dist?.integrity,
      });
    }

    return {
      name: doc.name,
      versions,
      description: doc.description,
      license: doc.license,
      homepage: doc.homepage,
      repository: doc.repository?.url,
    };
  }

  /**
   * Parse dependencies object to array.
   */
  private parseDependencies(deps?: Record<string, string>): readonly IDependencySpec[] {
    if (!deps) return [];

    return Object.entries(deps).map(([name, constraint]) => ({
      name,
      constraint,
    }));
  }

  /**
   * Serialize dependencies array to object.
   */
  private serializeDependencies(deps: readonly IDependencySpec[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const dep of deps) {
      result[dep.name] = dep.constraint;
    }
    return result;
  }

  /**
   * Fetch with retry logic.
   */
  private async fetchWithRetry(url: string, options?: IAdapterOptions): Promise<Response> {
    const maxRetries = options?.retries ?? 3;
    const timeout = options?.timeout ?? 30000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: options?.authToken
            ? { Authorization: `Bearer ${options.authToken}` }
            : undefined,
          signal: options?.signal ?? controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;

        if ((error as Error).name === 'AbortError') {
          throw error;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }
}
