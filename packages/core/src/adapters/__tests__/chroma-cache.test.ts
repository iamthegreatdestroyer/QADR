/**
 * @qadr/core - ChromaCache Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromaCache, createChromaCache } from '../chroma-cache.js';
import type { IPackageMetadata } from '../types.js';

const mockUpsert = vi.fn();
const mockGet = vi.fn();

const mockCollection = {
  upsert: mockUpsert,
  get: mockGet,
  delete: vi.fn(),
};

const MOCK_PACKAGE: IPackageMetadata = {
  name: 'react',
  versions: [{ version: '18.0.0', dependencies: [] }],
  description: 'A JavaScript library for building user interfaces',
};

describe('ChromaCache', () => {
  let cache: ChromaCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ ids: [], documents: [] });

    cache = new ChromaCache({ url: 'http://localhost:8000', collectionName: 'test' });
    // Bypass the real ChromaDB client — spy on the private method
    vi.spyOn(cache as never, 'getCollection').mockResolvedValue(mockCollection as never);
  });

  describe('getAsync()', () => {
    it('returns undefined for cache miss', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [null] });
      const result = await cache.getAsync('react');
      expect(result).toBeUndefined();
    });

    it('returns parsed metadata for cache hit', async () => {
      mockGet.mockResolvedValueOnce({
        ids: ['react'],
        documents: [JSON.stringify(MOCK_PACKAGE)],
      });
      const result = await cache.getAsync('react');
      expect(result).toEqual(MOCK_PACKAGE);
    });

    it('increments hits on hit', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['react'], documents: [JSON.stringify(MOCK_PACKAGE)] });
      await cache.getAsync('react');
      expect(cache.stats().hits).toBe(1);
      expect(cache.stats().misses).toBe(0);
    });

    it('increments misses on miss', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [null] });
      await cache.getAsync('unknown');
      expect(cache.stats().hits).toBe(0);
      expect(cache.stats().misses).toBe(1);
    });
  });

  describe('setAsync()', () => {
    it('upserts JSON-serialized metadata', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] }); // hasAsync check
      await cache.setAsync('react', MOCK_PACKAGE);
      expect(mockUpsert).toHaveBeenCalledWith({
        ids: ['react'],
        documents: [JSON.stringify(MOCK_PACKAGE)],
      });
    });

    it('increments sizeCount for new entries', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      await cache.setAsync('react', MOCK_PACKAGE);
      expect(cache.stats().size).toBe(1);
    });

    it('does not increment sizeCount for existing entries', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['react'], documents: [JSON.stringify(MOCK_PACKAGE)] });
      await cache.setAsync('react', MOCK_PACKAGE);
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('hasAsync()', () => {
    it('returns true when key exists', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['react'], documents: ['...'] });
      expect(await cache.hasAsync('react')).toBe(true);
    });

    it('returns false when key does not exist', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      expect(await cache.hasAsync('missing')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('resets stats to zero', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['r'], documents: [JSON.stringify(MOCK_PACKAGE)] });
      await cache.getAsync('r'); // hit — now hits=1
      cache.clear();
      expect(cache.stats()).toEqual({ hits: 0, misses: 0, size: 0 });
    });

    it('resets collection so getCollection is called again after clear', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      await cache.getAsync('a'); // initializes collection
      cache.clear();
      // After clear, getCollection should be called again on next access
      const spy = vi.spyOn(cache as never, 'getCollection').mockResolvedValue(mockCollection as never);
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      await cache.getAsync('b');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('createChromaCache()', () => {
    it('returns a ChromaCache instance', () => {
      expect(createChromaCache()).toBeInstanceOf(ChromaCache);
    });

    it('passes options through to constructor', () => {
      const custom = createChromaCache({ collectionName: 'my_cache' });
      expect(custom).toBeInstanceOf(ChromaCache);
    });
  });

  describe('synchronous stubs', () => {
    it('get() throws helpful error', () => {
      expect(() => cache.get('react')).toThrow('async');
    });

    it('has() throws helpful error', () => {
      expect(() => cache.has('react')).toThrow('async');
    });
  });
});
