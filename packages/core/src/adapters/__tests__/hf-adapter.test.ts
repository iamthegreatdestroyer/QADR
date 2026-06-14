/**
 * @qadr/core - HuggingFaceAdapter Tests
 *
 * Verifies model resolution for Qwen 3.x, Gemma-4, and other model families.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HuggingFaceAdapter } from '../hf-adapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeHFResponse(overrides: Record<string, unknown> = {}): object {
  return {
    id: 'Qwen/Qwen3-7B',
    sha: 'abc1234def5678abc1234def5678abc1234def56',
    lastModified: '2025-04-28T00:00:00.000Z',
    tags: ['transformers', 'pytorch', 'text-generation'],
    cardData: {
      library_name: 'transformers',
      pipeline_tag: 'text-generation',
    },
    config: {
      model_type: 'qwen3',
    },
    ...overrides,
  };
}

function mockOk(body: object): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function mock404(): void {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
}

describe('HuggingFaceAdapter', () => {
  let adapter: HuggingFaceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new HuggingFaceAdapter();
  });

  describe('fetchPackage()', () => {
    it('returns undefined for 404', async () => {
      mock404();
      const result = await adapter.fetchPackage('unknown/model');
      expect(result).toBeUndefined();
    });

    it('fetches correct HF Hub API URL', async () => {
      mockOk(makeHFResponse());
      await adapter.fetchPackage('Qwen/Qwen3-7B');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/models/qwen%2Fqwen3-7b'),
        expect.any(Object)
      );
    });

    it('returns IPackageMetadata with model sha as version', async () => {
      mockOk(makeHFResponse());
      const result = await adapter.fetchPackage('Qwen/Qwen3-7B');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Qwen/Qwen3-7B');
      expect(result!.versions[0]!.version).toBe('abc1234def5678abc1234def5678abc1234def56');
    });

    it('Qwen3: requires transformers>=4.51.0', async () => {
      mockOk(makeHFResponse({ config: { model_type: 'qwen3' } }));
      const result = await adapter.fetchPackage('Qwen/Qwen3-7B');
      const transformersDep = result!.versions[0]!.dependencies.find(
        (d) => d.name === 'transformers'
      );
      expect(transformersDep?.constraint).toBe('>=4.51.0');
    });

    it('Gemma-4 (gemma3 type): requires transformers>=4.51.0', async () => {
      mockOk(
        makeHFResponse({
          id: 'google/gemma-3-27b-it',
          config: { model_type: 'gemma3' },
          cardData: { library_name: 'transformers' },
        })
      );
      const result = await adapter.fetchPackage('google/gemma-3-27b-it');
      const transformersDep = result!.versions[0]!.dependencies.find(
        (d) => d.name === 'transformers'
      );
      expect(transformersDep?.constraint).toBe('>=4.51.0');
    });

    it('Gemma-2 (gemma2 type): requires transformers>=4.44.0', async () => {
      mockOk(
        makeHFResponse({
          id: 'google/gemma-2-27b',
          config: { model_type: 'gemma2' },
          cardData: { library_name: 'transformers' },
        })
      );
      const result = await adapter.fetchPackage('google/gemma-2-27b');
      const transformersDep = result!.versions[0]!.dependencies.find(
        (d) => d.name === 'transformers'
      );
      expect(transformersDep?.constraint).toBe('>=4.44.0');
    });

    it('unknown model_type uses base transformers>=4.40.0 floor', async () => {
      mockOk(makeHFResponse({ config: { model_type: 'unknown-model' } }));
      const result = await adapter.fetchPackage('acme/model');
      const transformersDep = result!.versions[0]!.dependencies.find(
        (d) => d.name === 'transformers'
      );
      expect(transformersDep?.constraint).toBe('>=4.40.0');
    });

    it('diffusers library_name uses diffusers deps', async () => {
      mockOk(
        makeHFResponse({
          id: 'stabilityai/stable-diffusion-3',
          cardData: { library_name: 'diffusers' },
          config: { model_type: 'unet2d' },
        })
      );
      const result = await adapter.fetchPackage('stabilityai/stable-diffusion-3');
      const depNames = result!.versions[0]!.dependencies.map((d) => d.name);
      expect(depNames).toContain('diffusers');
      expect(depNames).toContain('torch');
    });

    it('uses cache on second call', async () => {
      mockOk(makeHFResponse());
      const cache = new Map<string, object>();
      const mockCache = {
        get: (k: string) => cache.get(k) as object,
        set: (k: string, v: object) => { cache.set(k, v); },
        has: (k: string) => cache.has(k),
        clear: () => { cache.clear(); },
        stats: () => ({ hits: 0, misses: 0, size: cache.size }),
      };
      await adapter.fetchPackage('Qwen/Qwen3-7B', { cache: mockCache as never });
      await adapter.fetchPackage('Qwen/Qwen3-7B', { cache: mockCache as never });
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('all transformers models include torch dependency', async () => {
      mockOk(makeHFResponse());
      const result = await adapter.fetchPackage('Qwen/Qwen3-7B');
      const torchDep = result!.versions[0]!.dependencies.find((d) => d.name === 'torch');
      expect(torchDep).toBeDefined();
      expect(torchDep!.constraint).toBe('>=2.0.0');
    });
  });

  describe('fetchPackages()', () => {
    it('fetches multiple models', async () => {
      mockOk(makeHFResponse({ id: 'Qwen/Qwen3-7B' }));
      mockOk(makeHFResponse({ id: 'google/gemma-3-27b-it', config: { model_type: 'gemma3' } }));
      const results = await adapter.fetchPackages(['Qwen/Qwen3-7B', 'google/gemma-3-27b-it']);
      expect(results.size).toBe(2);
    });
  });

  describe('parseManifest()', () => {
    it('parses JSON manifest with dependencies array', () => {
      const content = JSON.stringify({
        name: 'my-ai-project',
        version: '1.0.0',
        dependencies: [
          { name: 'Qwen/Qwen3-7B', constraint: '*' },
          { name: 'google/gemma-3-27b-it', constraint: '*' },
        ],
      });
      const manifest = adapter.parseManifest(content);
      expect(manifest.name).toBe('my-ai-project');
      expect(manifest.dependencies).toHaveLength(2);
      expect(manifest.dependencies[0]!.name).toBe('Qwen/Qwen3-7B');
    });

    it('parses JSON manifest with models array shorthand', () => {
      const content = JSON.stringify({
        models: ['Qwen/Qwen3-7B', 'google/gemma-3-27b-it'],
      });
      const manifest = adapter.parseManifest(content);
      expect(manifest.dependencies).toHaveLength(2);
    });

    it('returns empty manifest on parse error', () => {
      const manifest = adapter.parseManifest('not json');
      expect(manifest.dependencies).toHaveLength(0);
    });
  });

  describe('generateManifest()', () => {
    it('round-trips through parseManifest', () => {
      const original = {
        name: 'test',
        version: '1.0.0',
        dependencies: [{ name: 'Qwen/Qwen3-7B', constraint: '*' }],
      };
      const generated = adapter.generateManifest(original);
      const parsed = adapter.parseManifest(generated);
      expect(parsed.name).toBe(original.name);
      expect(parsed.dependencies[0]!.name).toBe('Qwen/Qwen3-7B');
    });
  });

  describe('isValidVersion()', () => {
    it('accepts "latest"', () => expect(adapter.isValidVersion('latest')).toBe(true));
    it('accepts full SHA', () => expect(adapter.isValidVersion('abc1234def5678abc1234def5678abc1234def56')).toBe(true));
    it('accepts short SHA (7 chars)', () => expect(adapter.isValidVersion('abc1234')).toBe(true));
    it('rejects semver', () => expect(adapter.isValidVersion('1.0.0')).toBe(false));
  });

  describe('isValidConstraint()', () => {
    it('accepts "*"', () => expect(adapter.isValidConstraint('*')).toBe(true));
    it('accepts "@sha" pin', () => expect(adapter.isValidConstraint('@abc1234')).toBe(true));
    it('accepts SHA directly', () => expect(adapter.isValidConstraint('abc1234')).toBe(true));
  });

  describe('normalizePackageName()', () => {
    it('lowercases org/model', () => {
      expect(adapter.normalizePackageName('Qwen/Qwen3-7B')).toBe('qwen/qwen3-7b');
    });

    it('replaces spaces with hyphens', () => {
      expect(adapter.normalizePackageName('my model')).toBe('my-model');
    });
  });
});
