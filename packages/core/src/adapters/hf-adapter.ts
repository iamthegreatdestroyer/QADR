/**
 * HuggingFace Hub ecosystem adapter.
 *
 * Resolves HuggingFace model repositories as packages.
 * Model names follow the format: "{org}/{model}" or "{model}".
 *
 * Each model's Python package requirements are derived from:
 *   1. The model card's `library_name` field (e.g., "transformers", "diffusers")
 *   2. Model-type-specific overrides (e.g., Qwen3 requires transformers>=4.51.0)
 *
 * This enables QADR to resolve: which Python packages are needed to run a
 * given set of HuggingFace models, including Qwen 3.6, Gemma-4, etc.
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
 * HuggingFace Hub API model response.
 */
interface IHFModelInfo {
  readonly id: string;
  readonly sha: string;
  readonly lastModified?: string;
  readonly tags?: readonly string[];
  readonly cardData?: {
    readonly library_name?: string;
    readonly base_model?: string | null;
    readonly pipeline_tag?: string;
    readonly model_type?: string;
    readonly language?: string | readonly string[];
  };
  readonly config?: {
    readonly model_type?: string;
    readonly architectures?: readonly string[];
  };
  readonly description?: string;
  readonly private?: boolean;
  readonly downloads?: number;
  readonly likes?: number;
}

/**
 * Base Python deps by library_name.
 */
const LIBRARY_DEPS: Record<string, readonly IDependencySpec[]> = {
  transformers: [
    { name: 'transformers', constraint: '>=4.40.0' },
    { name: 'torch', constraint: '>=2.0.0' },
    { name: 'accelerate', constraint: '>=0.26.0' },
    { name: 'tokenizers', constraint: '>=0.19.0' },
  ],
  diffusers: [
    { name: 'diffusers', constraint: '>=0.27.0' },
    { name: 'torch', constraint: '>=2.0.0' },
    { name: 'accelerate', constraint: '>=0.26.0' },
    { name: 'transformers', constraint: '>=4.40.0' },
  ],
  'sentence-transformers': [
    { name: 'sentence-transformers', constraint: '>=3.0.0' },
    { name: 'torch', constraint: '>=2.0.0' },
    { name: 'transformers', constraint: '>=4.40.0' },
  ],
  peft: [
    { name: 'peft', constraint: '>=0.10.0' },
    { name: 'torch', constraint: '>=2.0.0' },
    { name: 'transformers', constraint: '>=4.40.0' },
  ],
  timm: [
    { name: 'timm', constraint: '>=1.0.0' },
    { name: 'torch', constraint: '>=2.0.0' },
  ],
  'llama-cpp-python': [
    { name: 'llama-cpp-python', constraint: '>=0.2.0' },
  ],
  vllm: [
    { name: 'vllm', constraint: '>=0.4.0' },
    { name: 'torch', constraint: '>=2.1.0' },
    { name: 'transformers', constraint: '>=4.40.0' },
  ],
};

/**
 * Per-model-type transformers version overrides.
 * Used for model families that require newer transformers builds.
 */
const MODEL_TYPE_TRANSFORMERS_FLOOR: Record<string, string> = {
  // Qwen3 family (2025) — requires transformers 4.51+
  qwen3: '>=4.51.0',
  // Gemma-4 (2025) — requires transformers 4.51+
  gemma3: '>=4.51.0',
  // Gemma-2 — 4.44+
  gemma2: '>=4.44.0',
  // Llama-4 — 4.51+
  llama4: '>=4.51.0',
  // Mistral v3 — 4.46+
  mistral3: '>=4.46.0',
};

/** Default deps when library is unknown. */
const DEFAULT_DEPS: readonly IDependencySpec[] = [
  { name: 'transformers', constraint: '>=4.40.0' },
  { name: 'torch', constraint: '>=2.0.0' },
];

/**
 * HuggingFace Hub ecosystem adapter.
 */
export class HuggingFaceAdapter implements IEcosystemAdapter {
  public readonly name = 'hf';
  public readonly defaultRegistryUrl = 'https://huggingface.co';

  public async fetchPackage(
    packageName: string,
    options?: IAdapterOptions
  ): Promise<IPackageMetadata | undefined> {
    const registryUrl = options?.registryUrl ?? this.defaultRegistryUrl;
    const normalized = this.normalizePackageName(packageName);

    if (options?.cache?.has(normalized)) {
      return options.cache.get(normalized);
    }

    const url = `${registryUrl}/api/models/${encodeURIComponent(normalized)}`;

    try {
      const response = await this.fetchWithRetry(url, options);

      if (!response.ok) {
        if (response.status === 404) return undefined;
        throw new Error(`Failed to fetch ${packageName}: ${response.status}`);
      }

      const info = (await response.json()) as IHFModelInfo;
      const metadata = this.transformModelInfo(info);

      options?.cache?.set(normalized, metadata);
      return metadata;
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      console.error(`Failed to fetch HF model ${packageName}:`, error);
      return undefined;
    }
  }

  public async fetchPackages(
    packageNames: readonly string[],
    options?: IAdapterOptions
  ): Promise<Map<string, IPackageMetadata>> {
    const results = new Map<string, IPackageMetadata>();
    const concurrency = 5;

    for (let i = 0; i < packageNames.length; i += concurrency) {
      const chunk = [...packageNames.slice(i, i + concurrency)];
      const metadatas = await Promise.all(chunk.map((n) => this.fetchPackage(n, options)));
      for (let j = 0; j < chunk.length; j++) {
        const meta = metadatas[j];
        if (meta) results.set(chunk[j]!, meta);
      }
    }

    return results;
  }

  /**
   * Parse an HF manifest (JSON listing model IDs as dependencies).
   * Format: { name, version, dependencies: [{name: "Qwen/Qwen3-7B", constraint: "*"}] }
   */
  public parseManifest(content: string): IManifest {
    try {
      const parsed = JSON.parse(content) as {
        name?: string;
        version?: string;
        models?: string[];
        dependencies?: Array<{ name: string; constraint?: string }>;
      };

      const rawDeps: Array<{ name: string; constraint?: string }> =
        parsed.dependencies ?? parsed.models?.map((m) => ({ name: m })) ?? [];
      const deps: IDependencySpec[] = rawDeps.map((d) => ({ name: d.name, constraint: d.constraint ?? '*' }));

      return {
        name: parsed.name ?? 'hf-project',
        version: parsed.version ?? '1.0.0',
        dependencies: deps,
      };
    } catch {
      return { name: 'hf-project', version: '1.0.0', dependencies: [] };
    }
  }

  public generateManifest(manifest: IManifest): string {
    return JSON.stringify(
      {
        name: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies.map((d) => ({
          name: d.name,
          constraint: d.constraint,
        })),
      },
      null,
      2
    );
  }

  public parseLockfile(content: string): ILockfile {
    try {
      const parsed = JSON.parse(content) as {
        version?: number;
        packages?: ILockfileEntry[];
      };
      return {
        version: parsed.version ?? 1,
        packages: parsed.packages ?? [],
      };
    } catch {
      return { version: 1, packages: [] };
    }
  }

  public generateLockfile(solution: readonly IResolvedPackage[]): string {
    const packages: ILockfileEntry[] = solution.map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      integrity: pkg.integrity ?? '',
      resolved: `https://huggingface.co/${pkg.name}/tree/${pkg.version}`,
    }));
    return JSON.stringify({ version: 1, packages }, null, 2);
  }

  /**
   * Valid versions: git commit SHA (40 hex chars), short SHA (7+ hex chars), or "latest".
   */
  public isValidVersion(version: string): boolean {
    return version === 'latest' || /^[0-9a-f]{7,40}$/.test(version);
  }

  /**
   * Valid constraints: "*" (any), "@<sha>" (pin), or exact SHA.
   */
  public isValidConstraint(constraint: string): boolean {
    return constraint === '*' || constraint.startsWith('@') || this.isValidVersion(constraint);
  }

  /**
   * Normalize model name: lowercase, preserve slash for org/model format.
   */
  public normalizePackageName(packageName: string): string {
    return packageName.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Transform HF Hub API response to IPackageMetadata.
   */
  private transformModelInfo(info: IHFModelInfo): IPackageMetadata {
    const modelType = info.config?.model_type ?? info.cardData?.model_type ?? '';
    const libraryName = info.cardData?.library_name ?? 'transformers';
    const sha = info.sha ?? 'latest';

    const baseDeps = [...(LIBRARY_DEPS[libraryName] ?? DEFAULT_DEPS)];
    const deps = this.applyModelTypeOverrides(baseDeps, modelType);

    const version: IVersionMetadata = {
      version: sha,
      dependencies: deps,
      ...(info.lastModified && { publishedAt: new Date(info.lastModified) }),
    };

    return {
      name: info.id,
      versions: [version],
      ...(info.description && { description: info.description }),
    };
  }

  /**
   * Apply model-type-specific constraint overrides (e.g., Qwen3 needs transformers>=4.51).
   */
  private applyModelTypeOverrides(
    deps: IDependencySpec[],
    modelType: string
  ): readonly IDependencySpec[] {
    const floor = MODEL_TYPE_TRANSFORMERS_FLOOR[modelType.toLowerCase()];
    if (!floor) return deps;

    return deps.map((d) => {
      if (d.name === 'transformers') {
        return { ...d, constraint: floor };
      }
      return d;
    });
  }

  private async fetchWithRetry(url: string, options?: IAdapterOptions): Promise<Response> {
    const maxRetries = options?.retries ?? 3;
    const timeout = options?.timeout ?? 30_000;
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
        if ((error as Error).name === 'AbortError') throw error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }
}
