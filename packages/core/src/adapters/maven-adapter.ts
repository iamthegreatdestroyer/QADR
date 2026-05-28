/**
 * Maven/Maven Central ecosystem adapter.
 *
 * Translates between Maven Central format and QADR dependency format.
 */

import type { IResolvedPackage } from '../types.js';
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
 * Maven Search API response.
 */
interface IMavenSearchResponse {
  readonly response: {
    readonly numFound: number;
    readonly docs: readonly IMavenArtifact[];
  };
}

/**
 * Maven artifact document.
 */
interface IMavenArtifact {
  readonly g: string; // groupId
  readonly a: string; // artifactId
  readonly v: string; // version
  readonly latestVersion?: string;
  readonly timestamp?: number;
  readonly versionCount?: number;
  readonly ec?: readonly string[]; // extensions
}

/**
 * Maven ecosystem adapter.
 */
export class MavenAdapter implements IEcosystemAdapter {
  public readonly name = 'maven';
  public readonly defaultRegistryUrl = 'https://search.maven.org/solrsearch';

  /**
   * Fetch metadata for a single package (artifact).
   *
   * Package name format: "groupId:artifactId"
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

    const [groupId, artifactId] = normalizedName.split(':');
    if (!groupId || !artifactId) {
      console.error(`Invalid Maven package name: ${packageName}`);
      return undefined;
    }

    // First, get the list of versions
    const versionsUrl =
      `${registryUrl}/select?q=g:"${groupId}"+AND+a:"${artifactId}"` +
      `&core=gav&rows=100&wt=json`;

    try {
      const response = await this.fetchWithRetry(versionsUrl, options);

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to fetch ${packageName}: ${response.status}`);
      }

      const doc = await response.json() as IMavenSearchResponse;
      const metadata = await this.transformMavenDocument(
        doc,
        groupId,
        artifactId,
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
    }

    return results;
  }

  /**
   * Parse a pom.xml file.
   */
  public parseManifest(content: string): IManifest {
    // Simple XML parsing - in production, use a proper XML parser
    const groupIdMatch = content.match(/<groupId>([^<]+)<\/groupId>/);
    const artifactIdMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
    const versionMatch = content.match(/<version>([^<]+)<\/version>/);

    const deps = this.parseDependenciesFromPom(content);

    return {
      name: `${groupIdMatch?.[1] ?? 'unknown'}:${artifactIdMatch?.[1] ?? 'unknown'}`,
      version: versionMatch?.[1] ?? '0.0.0',
      dependencies: deps.filter((d) => d.scope !== 'test'),
      devDependencies: deps.filter((d) => d.scope === 'test'),
      raw: content,
    };
  }

  /**
   * Generate a pom.xml file.
   */
  public generateManifest(manifest: IManifest): string {
    const [groupId, artifactId] = manifest.name.split(':');

    let pom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>${manifest.version}</version>

  <dependencies>
`;

    for (const dep of manifest.dependencies) {
      const [depGroup, depArtifact] = dep.name.split(':');
      pom += `    <dependency>
      <groupId>${depGroup}</groupId>
      <artifactId>${depArtifact}</artifactId>
      <version>${dep.constraint}</version>
    </dependency>
`;
    }

    for (const dep of manifest.devDependencies ?? []) {
      const [depGroup, depArtifact] = dep.name.split(':');
      pom += `    <dependency>
      <groupId>${depGroup}</groupId>
      <artifactId>${depArtifact}</artifactId>
      <version>${dep.constraint}</version>
      <scope>test</scope>
    </dependency>
`;
    }

    pom += `  </dependencies>
</project>`;

    return pom;
  }

  /**
   * Parse a lockfile (Maven doesn't have native lockfile, create one).
   */
  public parseLockfile(content: string): ILockfile {
    const packages: ILockfileEntry[] = [];

    // Parse our custom lockfile format
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      // Format: groupId:artifactId:version:sha256
      const parts = line.trim().split(':');
      if (parts.length >= 3) {
        packages.push({
          name: `${parts[0]}:${parts[1]}`,
          version: parts[2]!,
          integrity: parts[3] ? `sha256:${parts[3]}` : '',
          resolved: `https://repo1.maven.org/maven2/${parts[0]!.replace(/\./g, '/')}/${parts[1]}/${parts[2]}`,
        });
      }
    }

    return {
      version: 1,
      packages,
    };
  }

  /**
   * Generate a lockfile.
   */
  public generateLockfile(solution: readonly IResolvedPackage[]): string {
    const lines: string[] = [
      '# QADR Maven Lockfile',
      '# Format: groupId:artifactId:version:sha256',
      '',
    ];

    for (const pkg of solution) {
      const hash = pkg.integrity?.replace('sha256:', '') ?? '';
      lines.push(`${pkg.name}:${pkg.version}:${hash}`);
    }

    return lines.join('\n');
  }

  /**
   * Validate a Maven version string.
   */
  public isValidVersion(version: string): boolean {
    // Maven versions are quite flexible
    return /^[\d\w.-]+$/.test(version);
  }

  /**
   * Validate a Maven version constraint.
   */
  public isValidConstraint(constraint: string): boolean {
    // Maven version ranges: [1.0,2.0), (,1.5], etc.
    if (constraint.startsWith('[') || constraint.startsWith('(')) {
      return /^[\[\(][\d\w.,-]*[\]\)]$/.test(constraint);
    }
    return this.isValidVersion(constraint);
  }

  /**
   * Normalize a Maven package name.
   */
  public normalizePackageName(packageName: string): string {
    // Ensure format is groupId:artifactId
    return packageName.toLowerCase();
  }

  /**
   * Transform Maven search response to our format.
   */
  private async transformMavenDocument(
    doc: IMavenSearchResponse,
    groupId: string,
    artifactId: string,
    _options?: IAdapterOptions
  ): Promise<IPackageMetadata> {
    const versions: IVersionMetadata[] = [];

    // Sort versions newest first (by timestamp if available)
    const sortedDocs = [...doc.response.docs].sort(
      (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
    );

    for (const artifact of sortedDocs.slice(0, 50)) {
      // Note: Maven doesn't provide dependencies in search results
      // Would need to fetch POM for each version to get deps
      versions.push({
        version: artifact.v,
        dependencies: [],
        ...(artifact.timestamp && { publishedAt: new Date(artifact.timestamp) }),
      });
    }

    return {
      name: `${groupId}:${artifactId}`,
      versions,
    };
  }

  /**
   * Parse dependencies from POM XML.
   */
  private parseDependenciesFromPom(
    content: string
  ): { name: string; constraint: string; scope?: string }[] {
    const deps: { name: string; constraint: string; scope?: string }[] = [];

    // Find dependencies section
    const depsMatch = content.match(
      /<dependencies>([\s\S]*?)<\/dependencies>/
    );
    if (!depsMatch) return deps;

    const depsContent = depsMatch[1]!;

    // Parse each dependency
    const depMatches = depsContent.matchAll(
      /<dependency>([\s\S]*?)<\/dependency>/g
    );

    for (const match of depMatches) {
      const depXml = match[1]!;

      const groupIdMatch = depXml.match(/<groupId>([^<]+)<\/groupId>/);
      const artifactIdMatch = depXml.match(/<artifactId>([^<]+)<\/artifactId>/);
      const versionMatch = depXml.match(/<version>([^<]+)<\/version>/);
      const scopeMatch = depXml.match(/<scope>([^<]+)<\/scope>/);

      if (groupIdMatch && artifactIdMatch) {
        deps.push({
          name: `${groupIdMatch[1]}:${artifactIdMatch[1]}`,
          constraint: versionMatch?.[1] ?? '*',
          ...(scopeMatch?.[1] && { scope: scopeMatch[1] }),
        });
      }
    }

    return deps;
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
          ...(options?.authToken && { headers: { Authorization: `Bearer ${options.authToken}` } }),
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
