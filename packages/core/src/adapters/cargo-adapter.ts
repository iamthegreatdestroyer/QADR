/**
 * Cargo/crates.io ecosystem adapter.
 *
 * Translates between crates.io registry format and QADR dependency format.
 */

import type { IDependencySpec, IResolvedPackage } from '../types.js';
import type {
  IEcosystemAdapter,
  IPackageMetadata,
  IVersionMetadata,
  IManifest,
  ILockfile,
  ILockfileEntry,
  IAdapterOptions,
} from './types.js';

/**
 * crates.io API crate format.
 */
interface ICrateDocument {
  readonly crate: {
    readonly name: string;
    readonly description?: string;
    readonly homepage?: string;
    readonly repository?: string;
    readonly max_version: string;
    readonly max_stable_version?: string;
  };
  readonly versions: readonly ICrateVersion[];
}

/**
 * crates.io version format.
 */
interface ICrateVersion {
  readonly num: string;
  readonly license?: string;
  readonly yanked: boolean;
  readonly created_at: string;
  readonly crate_size?: number;
  readonly checksum: string;
  readonly features?: Record<string, readonly string[]>;
}

/**
 * crates.io dependencies endpoint.
 */
interface ICrateDependencies {
  readonly dependencies: readonly ICrateDependency[];
}

/**
 * crates.io dependency format.
 */
interface ICrateDependency {
  readonly crate_id: string;
  readonly req: string;
  readonly optional: boolean;
  readonly default_features: boolean;
  readonly features: readonly string[];
  readonly kind: 'normal' | 'dev' | 'build';
}

/**
 * Cargo ecosystem adapter.
 */
export class CargoAdapter implements IEcosystemAdapter {
  public readonly name = 'cargo';
  public readonly defaultRegistryUrl = 'https://crates.io/api/v1';

  /**
   * Fetch metadata for a single package (crate).
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

    const url = `${registryUrl}/crates/${encodeURIComponent(normalizedName)}`;

    try {
      const response = await this.fetchWithRetry(url, options);

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to fetch ${packageName}: ${response.status}`);
      }

      const doc = await response.json() as ICrateDocument;
      const metadata = await this.transformCrateDocument(
        doc,
        registryUrl,
        options
      );

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

    // crates.io has strict rate limits, use lower concurrency
    const concurrency = 5;
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

      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Parse a Cargo.toml file.
   */
  public parseManifest(content: string): IManifest {
    // Simple TOML parsing - in production, use a proper TOML parser
    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);

    const deps = this.parseDependenciesSection(content, '[dependencies]');
    const devDeps = this.parseDependenciesSection(content, '[dev-dependencies]');

    return {
      name: nameMatch?.[1] ?? 'unknown',
      version: versionMatch?.[1] ?? '0.0.0',
      dependencies: deps,
      devDependencies: devDeps,
      raw: content,
    };
  }

  /**
   * Generate a Cargo.toml file.
   */
  public generateManifest(manifest: IManifest): string {
    let toml = `[package]
name = "${manifest.name}"
version = "${manifest.version}"
edition = "2021"

[dependencies]
`;

    for (const dep of manifest.dependencies) {
      toml += `${dep.name} = "${dep.constraint}"\n`;
    }

    if (manifest.devDependencies && manifest.devDependencies.length > 0) {
      toml += `\n[dev-dependencies]\n`;
      for (const dep of manifest.devDependencies) {
        toml += `${dep.name} = "${dep.constraint}"\n`;
      }
    }

    return toml;
  }

  /**
   * Parse a Cargo.lock file.
   */
  public parseLockfile(content: string): ILockfile {
    const packages: ILockfileEntry[] = [];

    // Parse [[package]] sections
    const packageMatches = content.matchAll(
      /\[\[package\]\]\s*\nname = "([^"]+)"\s*\nversion = "([^"]+)"(?:\s*\nchecksum = "([^"]+)")?/g
    );

    for (const match of packageMatches) {
      packages.push({
        name: match[1]!,
        version: match[2]!,
        integrity: match[3] ? `sha256:${match[3]}` : '',
        resolved: `https://crates.io/crates/${match[1]}`,
      });
    }

    return {
      version: 3,
      packages,
    };
  }

  /**
   * Generate a Cargo.lock file.
   */
  public generateLockfile(solution: readonly IResolvedPackage[]): string {
    let lock = `# This file is generated by QADR
# Do not edit manually
version = 3

`;

    for (const pkg of solution) {
      lock += `[[package]]
name = "${pkg.name}"
version = "${pkg.version}"
`;
      if (pkg.integrity) {
        lock += `checksum = "${pkg.integrity.replace('sha256:', '')}"\n`;
      }
      lock += '\n';
    }

    return lock;
  }

  /**
   * Validate a semver version string.
   */
  public isValidVersion(version: string): boolean {
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?(\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Validate a Cargo version constraint.
   */
  public isValidConstraint(constraint: string): boolean {
    const operators = ['^', '~', '>', '<', '>=', '<=', '=', '*'];
    if (constraint === '*') return true;

    for (const op of operators) {
      if (constraint.startsWith(op)) {
        const version = constraint.slice(op.length);
        // Allow partial versions like "1" or "1.2"
        return /^\d+(\.\d+)?(\.\d+)?/.test(version);
      }
    }

    return this.isValidVersion(constraint);
  }

  /**
   * Normalize a crate name.
   */
  public normalizePackageName(packageName: string): string {
    // Cargo crate names are case-insensitive and underscores/hyphens equivalent
    return packageName.toLowerCase().replace(/-/g, '_');
  }

  /**
   * Transform crates.io document to our format.
   */
  private async transformCrateDocument(
    doc: ICrateDocument,
    registryUrl: string,
    options?: IAdapterOptions
  ): Promise<IPackageMetadata> {
    const versions: IVersionMetadata[] = [];

    // Sort versions newest first
    const sortedVersions = [...doc.versions]
      .filter((v) => !v.yanked)
      .sort((a, b) => this.compareVersions(b.num, a.num));

    for (const version of sortedVersions.slice(0, 50)) {
      // Limit to recent versions
      // Fetch dependencies for this version
      const deps = await this.fetchVersionDependencies(
        doc.crate.name,
        version.num,
        registryUrl,
        options
      );

      versions.push({
        version: version.num,
        dependencies: deps.filter((d) => d.type === 'normal').map((d) => d.spec),
        devDependencies: deps.filter((d) => d.type === 'dev').map((d) => d.spec),
        publishedAt: new Date(version.created_at),
        ...(version.crate_size !== undefined && { size: version.crate_size }),
        ...(version.checksum && { integrity: `sha256:${version.checksum}` }),
      });
    }

    return {
      name: doc.crate.name,
      versions,
      ...(doc.crate.description && { description: doc.crate.description }),
      ...(doc.crate.homepage && { homepage: doc.crate.homepage }),
      ...(doc.crate.repository && { repository: doc.crate.repository }),
      ...(sortedVersions[0]?.license && { license: sortedVersions[0].license }),
    };
  }

  /**
   * Fetch dependencies for a specific version.
   */
  private async fetchVersionDependencies(
    crateName: string,
    version: string,
    registryUrl: string,
    options?: IAdapterOptions
  ): Promise<{ spec: IDependencySpec; type: string }[]> {
    const url = `${registryUrl}/crates/${crateName}/${version}/dependencies`;

    try {
      const response = await this.fetchWithRetry(url, options);
      if (!response.ok) return [];

      const doc = await response.json() as ICrateDependencies;

      return doc.dependencies
        .filter((d) => !d.optional)
        .map((d) => ({
          spec: {
            name: d.crate_id,
            constraint: d.req,
          },
          type: d.kind,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Parse dependencies section from TOML.
   */
  private parseDependenciesSection(
    content: string,
    section: string
  ): IDependencySpec[] {
    const deps: IDependencySpec[] = [];

    const sectionIndex = content.indexOf(section);
    if (sectionIndex === -1) return deps;

    const nextSectionIndex = content.indexOf('\n[', sectionIndex + 1);
    const sectionContent =
      nextSectionIndex === -1
        ? content.slice(sectionIndex)
        : content.slice(sectionIndex, nextSectionIndex);

    // Match: package = "version" or package = { version = "..." }
    const simpleMatches = sectionContent.matchAll(
      /^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/gm
    );
    for (const match of simpleMatches) {
      deps.push({ name: match[1]!, constraint: match[2]! });
    }

    const complexMatches = sectionContent.matchAll(
      /^([a-zA-Z0-9_-]+)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"[^}]*\}/gm
    );
    for (const match of complexMatches) {
      deps.push({ name: match[1]!, constraint: match[2]! });
    }

    return deps;
  }

  /**
   * Compare two semver versions.
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map((p) => parseInt(p, 10) || 0);
    const partsB = b.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < 3; i++) {
      const pa = partsA[i] ?? 0;
      const pb = partsB[i] ?? 0;
      if (pa !== pb) return pa - pb;
    }

    return 0;
  }

  /**
   * Fetch with retry logic.
   */
  private async fetchWithRetry(
    url: string,
    options?: IAdapterOptions
  ): Promise<Response> {
    const maxRetries = options?.retries ?? 3;
    const timeout = options?.timeout ?? 30000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'QADR/1.0 (https://github.com/iamthegreatdestroyer/QADR)',
            ...(options?.authToken
              ? { Authorization: `Bearer ${options.authToken}` }
              : {}),
          },
          signal: options?.signal ?? controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;

        if ((error as Error).name === 'AbortError') {
          throw error;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError;
  }
}
