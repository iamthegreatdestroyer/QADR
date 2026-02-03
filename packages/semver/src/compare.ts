/**
 * Semantic version comparison.
 *
 * Functions for comparing and sorting semver versions.
 *
 * @example
 * ```typescript
 * import { compare, sort, gt, lt, eq } from '@qadr/semver';
 *
 * compare('1.0.0', '2.0.0'); // -1
 * gt('2.0.0', '1.0.0'); // true
 * lt('1.0.0-alpha', '1.0.0'); // true
 *
 * sort(['1.2.0', '1.0.0', '2.0.0']); // ['1.0.0', '1.2.0', '2.0.0']
 * ```
 */

import type { ISemVer, CompareResult, SortOrder, IParseOptions } from './types.js';
import { parse } from './parse.js';

/**
 * Compare two semver objects.
 *
 * Comparison follows semver precedence rules:
 * 1. Compare major, then minor, then patch
 * 2. Pre-release versions have lower precedence than release versions
 * 3. Pre-release identifiers are compared left-to-right
 * 4. Numeric identifiers < alphanumeric identifiers
 *
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareSemVer(a: ISemVer, b: ISemVer): CompareResult {
  // Compare major.minor.patch
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }

  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }

  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }

  // Handle pre-release precedence
  // No prerelease > has prerelease
  if (a.prerelease.length === 0 && b.prerelease.length === 0) {
    return 0;
  }

  if (a.prerelease.length === 0) {
    return 1; // a is release, b is prerelease
  }

  if (b.prerelease.length === 0) {
    return -1; // a is prerelease, b is release
  }

  // Compare prerelease identifiers
  const maxLen = Math.max(a.prerelease.length, b.prerelease.length);

  for (let i = 0; i < maxLen; i++) {
    const aId = a.prerelease[i];
    const bId = b.prerelease[i];

    // Shorter prerelease array has lower precedence
    if (aId === undefined) return -1;
    if (bId === undefined) return 1;

    const aIsNum = /^\d+$/.test(aId);
    const bIsNum = /^\d+$/.test(bId);

    if (aIsNum && bIsNum) {
      // Numeric comparison
      const aNum = parseInt(aId, 10);
      const bNum = parseInt(bId, 10);
      if (aNum !== bNum) {
        return aNum < bNum ? -1 : 1;
      }
    } else if (aIsNum && !bIsNum) {
      // Numeric < alphanumeric
      return -1;
    } else if (!aIsNum && bIsNum) {
      // Alphanumeric > numeric
      return 1;
    } else {
      // Both alphanumeric - string comparison
      if (aId < bId) return -1;
      if (aId > bId) return 1;
    }
  }

  return 0;
}

/**
 * Compare two version strings.
 *
 * @param a - First version string
 * @param b - Second version string
 * @param options - Parsing options
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 * @throws Error if either version is invalid
 */
export function compare(
  a: string,
  b: string,
  options: IParseOptions = {}
): CompareResult {
  const aParsed = parse(a, options);
  const bParsed = parse(b, options);

  if (!aParsed) {
    throw new Error(`Invalid version: ${a}`);
  }

  if (!bParsed) {
    throw new Error(`Invalid version: ${b}`);
  }

  return compareSemVer(aParsed, bParsed);
}

/**
 * Check if version a is greater than version b.
 */
export function gt(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) === 1;
}

/**
 * Check if version a is greater than or equal to version b.
 */
export function gte(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) >= 0;
}

/**
 * Check if version a is less than version b.
 */
export function lt(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) === -1;
}

/**
 * Check if version a is less than or equal to version b.
 */
export function lte(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) <= 0;
}

/**
 * Check if version a equals version b.
 */
export function eq(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) === 0;
}

/**
 * Check if version a does not equal version b.
 */
export function neq(a: string, b: string, options?: IParseOptions): boolean {
  return compare(a, b, options) !== 0;
}

/**
 * Sort an array of version strings.
 *
 * @param versions - Array of version strings
 * @param order - Sort order ('asc' or 'desc')
 * @param options - Parsing options
 * @returns New sorted array
 */
export function sort(
  versions: readonly string[],
  order: SortOrder = 'asc',
  options: IParseOptions = {}
): string[] {
  const parsed = versions
    .map((v) => ({ raw: v, parsed: parse(v, options) }))
    .filter((item): item is { raw: string; parsed: ISemVer } => item.parsed !== null);

  parsed.sort((a, b) => {
    const result = compareSemVer(a.parsed, b.parsed);
    return order === 'desc' ? -result : result;
  });

  return parsed.map((item) => item.raw);
}

/**
 * Sort an array of semver objects.
 *
 * @param versions - Array of semver objects
 * @param order - Sort order ('asc' or 'desc')
 * @returns New sorted array
 */
export function sortSemVer(
  versions: readonly ISemVer[],
  order: SortOrder = 'asc'
): ISemVer[] {
  const result = [...versions];
  result.sort((a, b) => {
    const cmp = compareSemVer(a, b);
    return order === 'desc' ? -cmp : cmp;
  });
  return result;
}

/**
 * Find the minimum version in an array.
 *
 * @param versions - Array of version strings
 * @param options - Parsing options
 * @returns Minimum version, or null if array is empty or all invalid
 */
export function min(
  versions: readonly string[],
  options: IParseOptions = {}
): string | null {
  const sorted = sort(versions, 'asc', options);
  return sorted[0] ?? null;
}

/**
 * Find the maximum version in an array.
 *
 * @param versions - Array of version strings
 * @param options - Parsing options
 * @returns Maximum version, or null if array is empty or all invalid
 */
export function max(
  versions: readonly string[],
  options: IParseOptions = {}
): string | null {
  const sorted = sort(versions, 'desc', options);
  return sorted[0] ?? null;
}

/**
 * Calculate the difference between two versions.
 *
 * @param a - First version
 * @param b - Second version
 * @param options - Parsing options
 * @returns The type of difference, or null if versions are equal
 */
export function diff(
  a: string,
  b: string,
  options: IParseOptions = {}
): 'major' | 'minor' | 'patch' | 'prerelease' | null {
  const aParsed = parse(a, options);
  const bParsed = parse(b, options);

  if (!aParsed || !bParsed) {
    throw new Error(`Invalid version: ${!aParsed ? a : b}`);
  }

  if (aParsed.major !== bParsed.major) {
    return 'major';
  }

  if (aParsed.minor !== bParsed.minor) {
    return 'minor';
  }

  if (aParsed.patch !== bParsed.patch) {
    return 'patch';
  }

  if (compareSemVer(aParsed, bParsed) !== 0) {
    return 'prerelease';
  }

  return null;
}
