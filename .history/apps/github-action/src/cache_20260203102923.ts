/**
 * QADR Cache Manager for GitHub Action
 *
 * Handles caching of resolution results to speed up subsequent runs.
 */

import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ActionInputs } from './inputs';

/**
 * Cache manager for resolution results
 */
export class CacheManager {
  private cacheKey: string = '';
  private restoreKeys: string[] = [];
  private cachePaths: string[] = [];

  constructor(private inputs: ActionInputs) {
    this.cachePaths = [
      path.join(inputs.workingDirectory, '.qadr-cache'),
    ];
  }

  /**
   * Restore cache
   */
  async restore(): Promise<boolean> {
    try {
      // Generate cache key
      this.cacheKey = await this.generateCacheKey();
      this.restoreKeys = [
        `qadr-${this.inputs.ecosystem}-`,
      ];

      core.debug(`Cache key: ${this.cacheKey}`);
      core.debug(`Restore keys: ${this.restoreKeys.join(', ')}`);

      // Try to restore cache
      const cacheHit = await cache.restoreCache(
        this.cachePaths,
        this.cacheKey,
        this.restoreKeys
      );

      if (cacheHit) {
        core.info(`✅ Cache restored from key: ${cacheHit}`);
        return true;
      }

      core.info('ℹ️ Cache not found');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to restore cache: ${message}`);
      return false;
    }
  }

  /**
   * Save cache
   */
  async save(): Promise<void> {
    try {
      // Ensure cache directory exists
      const cacheDir = this.cachePaths[0];
      await fs.mkdir(cacheDir, { recursive: true });

      // Write cache metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        ecosystem: this.inputs.ecosystem,
        key: this.cacheKey,
      };

      await fs.writeFile(
        path.join(cacheDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Save cache
      await cache.saveCache(this.cachePaths, this.cacheKey);
      core.info(`✅ Cache saved with key: ${this.cacheKey}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Cache already exists is not an error
      if (message.includes('already exists')) {
        core.debug('Cache already exists, skipping save');
        return;
      }

      core.warning(`Failed to save cache: ${message}`);
    }
  }

  /**
   * Generate cache key based on manifest content
   */
  private async generateCacheKey(): Promise<string> {
    try {
      const manifestContent = await fs.readFile(this.inputs.manifestPath, 'utf-8');
      const hash = crypto
        .createHash('sha256')
        .update(manifestContent)
        .digest('hex')
        .substring(0, 16);

      return `qadr-${this.inputs.ecosystem}-${hash}`;
    } catch (error) {
      // If manifest doesn't exist, use a fallback
      const fallback = crypto.randomBytes(8).toString('hex');
      return `qadr-${this.inputs.ecosystem}-${fallback}`;
    }
  }
}
