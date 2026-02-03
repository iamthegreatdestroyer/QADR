/**
 * pip/PyPI ecosystem adapter.
 *
 * Translates between PyPI registry format and QADR dependency format.
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
 * PyPI JSON API package format.
 */
interface IPyPIPackageDocument {
  readonly info: {
    readonly name: string;
    readonly version: string;
    readonly summary?: string;
    readonly license?: string;
    readonly home_page?: string;
    readonly project_urls?: Record<string, string>;
    readonly requires_dist?: readonly string[];
  };
  readonly releases: Record<string, readonly IPyPIReleaseInfo[]>;
}

/**
 * PyPI release info.
 */
interface IPyPIReleaseInfo {
  readonly filename: string;
  readonly packagetype: string;
  readonly size: number;
  readonly upload_time?: string;
  readonly digests: {
    readonly sha256: string;
  };
  readonly requires_python?: string;
  readonly yanked?: boolean;
}

/**
 * pip ecosystem adapter.
 */
export class PipAdapter implements IEcosystemAdapter {
  public readonly name = 'pip';
  public readonly defaultRegistryUrl = 'https://pypi.org/pypi';

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

    const url = `${registryUrl}/${encodeURIComponent(normalizedName)}/json`;

    try {
      const response = await this.fetchWithRetry(url, options);

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to fetch ${packageName}: ${response.status}`);
      }

      const doc: IPyPIPackageDocument = await response.json();
      const metadata = this.transformPyPIDocument(doc);

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
   * Parse a pyproject.toml or requirements.txt file.
   */
  public parseManifest(content: string): IManifest {
    // Try to detect format
    if (content.includes('[project]') || content.includes('[tool.poetry]')) {
      return this.parsePyProjectToml(content);
    }
    return this.parseRequirementsTxt(content);
  }

  /**
   * Generate a pyproject.toml file.
   */
  public generateManifest(manifest: IManifest): string {
    const deps = manifest.dependencies
      .map((d) => `    "${d.name}${d.constraint ? d.constraint : ''}"`)
      .join(',\n');

    const devDeps = (manifest.devDependencies ?? [])
      .map((d) => `    "${d.name}${d.constraint ? d.constraint : ''}"`)
      .join(',\n');

    return `[project]
name = "${manifest.name}"
version = "${manifest.version}"
dependencies = [
${deps}
]

[project.optional-dependencies]
dev = [
${devDeps}
]
`;
  }

  /**
   * Parse a requirements.txt style lockfile.
   */
  public parseLockfile(content: string): ILockfile {
    const packages: ILockfileEntry[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse: package==version --hash=sha256:xxx
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)==([^\s]+)(?:\s+--hash=([^\s]+))?/);
      if (match) {
        packages.push({
          name: match[1]!,
          version: match[2]!,
          integrity: match[3] ?? '',
          resolved: `https://pypi.org/simple/${match[1]}/`,
        });
      }
    }

    return {
      version: 1,
      packages,
    };
  }

  /**
   * Generate a requirements.txt lockfile.
   */
  public generateLockfile(solution: readonly IResolvedPackage[]): string {
    const lines: string[] = [
      '# This file is generated by QADR',
      '# Do not edit manually',
      '',
    ];

    for (const pkg of solution) {
      let line = `${pkg.name}==${pkg.version}`;
      if (pkg.integrity) {
        line += ` --hash=${pkg.integrity}`;
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Validate a PEP 440 version string.
   */
  public isValidVersion(version: string): boolean {
    // Simplified PEP 440 validation
    const pep440Regex =
      /^([1-9][0-9]*!)?(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))*((a|b|rc)(0|[1-9][0-9]*))?(\.post(0|[1-9][0-9]*))?(\.dev(0|[1-9][0-9]*))?(\+[a-z0-9]+(\.[a-z0-9]+)*)?$/i;
    return pep440Regex.test(version);
  }

  /**
   * Validate a PEP 440 version constraint.
   */
  public isValidConstraint(constraint: string): boolean {
    const operators = ['==', '!=', '<=', '>=', '<', '>', '~=', '==='];
    for (const op of operators) {
      if (constraint.startsWith(op)) {
        return true;
      }
    }
    // Also allow just version number (implicit ==)
    return this.isValidVersion(constraint);
  }

  /**
   * Normalize a package name (PEP 503).
   */
  public normalizePackageName(packageName: string): string {
    // Replace underscores and dots with hyphens, lowercase
    return packageName.toLowerCase().replace(/[_.-]+/g, '-');
  }

  /**
   * Transform PyPI document to our format.
   */
  private transformPyPIDocument(doc: IPyPIPackageDocument): IPackageMetadata {
    const versions: IVersionMetadata[] = [];

    // Get all versions, sorted newest first
    const versionKeys = Object.keys(doc.releases)
      .filter((v) => this.isValidVersion(v))
      .sort((a, b) => this.compareVersions(b, a));

    for (const version of versionKeys) {
      const releases = doc.releases[version];
      if (!releases || releases.length === 0) continue;

      // Find wheel or sdist
      const release = releases.find(
        (r) => r.packagetype === 'bdist_wheel' || r.packagetype === 'sdist'
      );
      if (!release || release.yanked) continue;

      // Parse requires_dist for dependencies
      const dependencies = this.parseRequiresDist(doc.info.requires_dist);

      versions.push({
        version,
        dependencies,
        publishedAt: release.upload_time
          ? new Date(release.upload_time)
          : undefined,
        size: release.size,
        integrity: `sha256:${release.digests.sha256}`,
      });
    }

    return {
      name: doc.info.name,
      versions,
      description: doc.info.summary,
      license: doc.info.license,
      homepage: doc.info.home_page,
      repository: doc.info.project_urls?.['Source'],
    };
  }

  /**
   * Parse requires_dist into dependencies.
   */
  private parseRequiresDist(
    requiresDist?: readonly string[]
  ): readonly IDependencySpec[] {
    if (!requiresDist) return [];

    const deps: IDependencySpec[] = [];

    for (const req of requiresDist) {
      // Parse: "package-name (>=1.0,<2.0) ; extra == 'dev'"
      const match = req.match(/^([a-zA-Z0-9_-]+)\s*(\([^)]+\))?/);
      if (match) {
        const name = match[1]!;
        const constraint = match[2]?.slice(1, -1) ?? '*';

        // Skip extras for now
        if (!req.includes('extra ==')) {
          deps.push({ name, constraint });
        }
      }
    }

    return deps;
  }

  /**
   * Parse pyproject.toml.
   */
  private parsePyProjectToml(content: string): IManifest {
    // Simple TOML parsing for the relevant sections
    // In production, use a proper TOML parser

    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);

    const deps: IDependencySpec[] = [];
    const depsMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsMatch) {
      const depsContent = depsMatch[1]!;
      const depMatches = depsContent.matchAll(/"([^"]+)"/g);
      for (const m of depMatches) {
        const parsed = this.parseDependencyString(m[1]!);
        if (parsed) deps.push(parsed);
      }
    }

    return {
      name: nameMatch?.[1] ?? 'unknown',
      version: versionMatch?.[1] ?? '0.0.0',
      dependencies: deps,
    };
  }

  /**
   * Parse requirements.txt.
   */
  private parseRequirementsTxt(content: string): IManifest {
    const deps: IDependencySpec[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
        continue;
      }

      const parsed = this.parseDependencyString(trimmed);
      if (parsed) deps.push(parsed);
    }

    return {
      name: 'unknown',
      version: '0.0.0',
      dependencies: deps,
    };
  }

  /**
   * Parse a single dependency string.
   */
  private parseDependencyString(dep: string): IDependencySpec | null {
    const match = dep.match(/^([a-zA-Z0-9_-]+)\s*(.*)$/);
    if (!match) return null;

    return {
      name: match[1]!,
      constraint: match[2] || '*',
    };
  }

  /**
   * Compare two PEP 440 versions.
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map((p) => parseInt(p, 10) || 0);
    const partsB = b.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
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
