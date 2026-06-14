/**
 * @qadr/core - ChromaDB Adapter Cache
 *
 * Persistent IAdapterCache backed by ChromaDB (Rust rewrite, 4x faster than Python).
 * Survives process restarts — eliminates redundant registry fetches across runs.
 *
 * Install: pnpm add chromadb
 * Server:  docker run -p 8000:8000 chromadb/chroma
 */

import type { ChromaClient } from 'chromadb';
import type { IAdapterCache, IPackageMetadata } from './types.js';

type ChromaCollection = Awaited<ReturnType<ChromaClient['getOrCreateCollection']>>;

export interface ChromaCacheOptions {
  /** ChromaDB server URL. @default 'http://localhost:8000' */
  url?: string;
  /** Collection name. @default 'qadr_package_cache' */
  collectionName?: string;
  /** ChromaDB tenant. @default 'default_tenant' */
  tenant?: string;
  /** ChromaDB database. @default 'default_database' */
  database?: string;
}

/**
 * ChromaDB-backed adapter cache.
 * Implements IAdapterCache with persistent storage across process restarts.
 */
export class ChromaCache implements IAdapterCache {
  private readonly url: string;
  private readonly collectionName: string;
  private readonly tenant: string;
  private readonly database: string;
  private collection: ChromaCollection | null = null;
  private hits = 0;
  private misses = 0;
  private sizeCount = 0;

  constructor(options: ChromaCacheOptions = {}) {
    this.url = options.url ?? 'http://localhost:8000';
    this.collectionName = options.collectionName ?? 'qadr_package_cache';
    this.tenant = options.tenant ?? 'default_tenant';
    this.database = options.database ?? 'default_database';
  }

  private async getCollection(): Promise<ChromaCollection> {
    if (!this.collection) {
      let Client: typeof ChromaClient;
      try {
        const mod = await import('chromadb');
        Client = mod.ChromaClient;
      } catch {
        throw new Error(
          'chromadb package is not installed.\n' +
            'Install it with: pnpm add chromadb\n' +
            'Start the server: docker run -p 8000:8000 chromadb/chroma'
        );
      }

      const client = new Client({
        path: this.url,
        tenant: this.tenant,
        database: this.database,
      });
      this.collection = await client.getOrCreateCollection({ name: this.collectionName });
    }
    return this.collection;
  }

  get(_packageName: string): IPackageMetadata | undefined {
    throw new Error(
      'ChromaCache.get() is synchronous but ChromaDB requires async access. ' +
        'Use getAsync() instead, or wrap in an async context.'
    );
  }

  async getAsync(packageName: string): Promise<IPackageMetadata | undefined> {
    const col = await this.getCollection();
    const result = await col.get({ ids: [packageName] });
    const doc = result.documents?.[0];
    if (typeof doc === 'string') {
      this.hits++;
      return JSON.parse(doc) as IPackageMetadata;
    }
    this.misses++;
    return undefined;
  }

  set(packageName: string, metadata: IPackageMetadata): void {
    void this.setAsync(packageName, metadata);
  }

  async setAsync(packageName: string, metadata: IPackageMetadata): Promise<void> {
    const col = await this.getCollection();
    const isNew = !(await this.hasAsync(packageName));
    await col.upsert({ ids: [packageName], documents: [JSON.stringify(metadata)] });
    if (isNew) this.sizeCount++;
  }

  has(_packageName: string): boolean {
    throw new Error(
      'ChromaCache.has() is synchronous but ChromaDB requires async access. ' +
        'Use hasAsync() instead.'
    );
  }

  async hasAsync(packageName: string): Promise<boolean> {
    const col = await this.getCollection();
    const result = await col.get({ ids: [packageName] });
    return (result.ids?.length ?? 0) > 0;
  }

  clear(): void {
    this.collection = null;
    this.hits = 0;
    this.misses = 0;
    this.sizeCount = 0;
  }

  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.sizeCount };
  }
}

/**
 * Create a ChromaDB-backed adapter cache.
 */
export function createChromaCache(options?: ChromaCacheOptions): ChromaCache {
  return new ChromaCache(options);
}
