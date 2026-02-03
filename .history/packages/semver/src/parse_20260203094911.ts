/**
 * Semantic version parser.
 *
 * Parses version strings into structured objects following
 * the Semantic Versioning 2.0.0 specification.
 *
 * @see https://semver.org/
 *
 * @example
 * ```typescript
 * import { parse, isValid } from '@qadr/semver';
 *
 * const version = parse('1.2.3-alpha.1+build.123');
 * console.log(version.major); // 1
 * console.log(version.minor); // 2
 * console.log(version.patch); // 3
 * console.log(version.prerelease); // ['alpha', '1']
 * console.log(version.build); // ['build', '123']
 *
 * console.log(isValid('1.0.0')); // true
 * console.log(isValid('invalid')); // false
 * ```
 */

import type { ISemVer, IParseOptions } from './types.js';

/**
 * Regex for strict semver parsing.
 * Matches: major.minor.patch[-prerelease][+build]
 */
const SEMVER_REGEX =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Regex for loose semver parsing (allows missing minor/patch).
 */
const LOOSE_REGEX =
  /^v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parse a version string into a structured semver object.
 *
 * @param version - Version string to parse
 * @param options - Parsing options
 * @returns Parsed semver object, or null if invalid
 *
 * @example
 * ```typescript
 * parse('1.2.3');
 * // { major: 1, minor: 2, patch: 3, prerelease: [], build: [] }
 *
 * parse('2.0', { loose: true });
 * // { major: 2, minor: 0, patch: 0, prerelease: [], build: [] }
 * ```
 */
export function parse(
  version: string,
  options: IParseOptions = {}
): ISemVer | null {
  const trimmed = version.trim();
  const regex = options.loose ? LOOSE_REGEX : SEMVER_REGEX;
  const match = regex.exec(trimmed);

  if (!match) {
    return null;
  }

  const [, majorStr, minorStr, patchStr, prereleaseStr, buildStr] = match;

  const major = parseInt(majorStr ?? '0', 10);
  const minor = parseInt(minorStr ?? '0', 10);
  const patch = parseInt(patchStr ?? '0', 10);

  const prerelease = prereleaseStr ? prereleaseStr.split('.') : [];
  const build = buildStr ? buildStr.split('.') : [];

  return Object.freeze({
    major,
    minor,
    patch,
    prerelease: Object.freeze(prerelease),
    build: Object.freeze(build),
    raw: trimmed,
  });
}

/**
 * Check if a version string is valid semver.
 *
 * @param version - Version string to validate
 * @param options - Parsing options
 * @returns True if valid semver
 */
export function isValid(
  version: string,
  options: IParseOptions = {}
): boolean {
  return parse(version, options) !== null;
}

/**
 * Coerce a version string to semver format.
 *
 * Attempts to extract a semver from strings like:
 * - "v1.2.3" -> "1.2.3"
 * - "1.2" -> "1.2.0"
 * - "1" -> "1.0.0"
 * - "1.2.3.4" -> "1.2.3"
 *
 * @param version - Version string to coerce
 * @returns Coerced semver object, or null if cannot be coerced
 */
export function coerce(version: string): ISemVer | null {
  // Try loose parsing first
  const loose = parse(version, { loose: true });
  if (loose) {
    return loose;
  }

  // Try to extract version from longer strings
  const extractRegex = /v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?/;
  const match = extractRegex.exec(version);

  if (match) {
    const [matched, major, minor, patch] = match;
    const normalizedVersion = `${major ?? 0}.${minor ?? 0}.${patch ?? 0}`;
    return parse(normalizedVersion, { loose: true });
  }

  return null;
}

/**
 * Format a semver object back to a string.
 *
 * @param version - Semver object to format
 * @param options - Formatting options
 * @returns Formatted version string
 */
export function format(
  version: ISemVer,
  options: { includeBuild?: boolean } = {}
): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;

  if (version.prerelease.length > 0) {
    result += `-${version.prerelease.join('.')}`;
  }

  if (options.includeBuild && version.build.length > 0) {
    result += `+${version.build.join('.')}`;
  }

  return result;
}

/**
 * Get major version as a new semver.
 *
 * @param version - Source version
 * @returns Version with only major (minor=0, patch=0)
 */
export function major(version: ISemVer): ISemVer {
  return Object.freeze({
    major: version.major,
    minor: 0,
    patch: 0,
    prerelease: Object.freeze([]),
    build: Object.freeze([]),
    raw: `${version.major}.0.0`,
  });
}

/**
 * Get minor version as a new semver.
 *
 * @param version - Source version
 * @returns Version with major.minor (patch=0)
 */
export function minor(version: ISemVer): ISemVer {
  return Object.freeze({
    major: version.major,
    minor: version.minor,
    patch: 0,
    prerelease: Object.freeze([]),
    build: Object.freeze([]),
    raw: `${version.major}.${version.minor}.0`,
  });
}

/**
 * Increment a version component.
 *
 * @param version - Source version
 * @param release - Component to increment ('major', 'minor', 'patch', 'prerelease')
 * @param identifier - Prerelease identifier for prerelease increments
 * @returns New incremented version
 */
export function increment(
  version: ISemVer,
  release: 'major' | 'minor' | 'patch' | 'prerelease',
  identifier?: string
): ISemVer {
  let newMajor = version.major;
  let newMinor = version.minor;
  let newPatch = version.patch;
  let newPrerelease: string[] = [];

  switch (release) {
    case 'major':
      newMajor++;
      newMinor = 0;
      newPatch = 0;
      break;

    case 'minor':
      newMinor++;
      newPatch = 0;
      break;

    case 'patch':
      // If has prerelease, dropping it is the "patch" increment
      if (version.prerelease.length === 0) {
        newPatch++;
      }
      break;

    case 'prerelease':
      if (version.prerelease.length === 0) {
        // First prerelease
        newPatch++;
        newPrerelease = [identifier ?? 'alpha', '0'];
      } else {
        // Increment last numeric part of prerelease
        newPrerelease = [...version.prerelease];
        const lastIndex = newPrerelease.length - 1;
        const last = newPrerelease[lastIndex];

        if (last !== undefined && /^\d+$/.test(last)) {
          newPrerelease[lastIndex] = String(parseInt(last, 10) + 1);
        } else {
          newPrerelease.push('0');
        }
      }
      break;
  }

  const raw = newPrerelease.length > 0
    ? `${newMajor}.${newMinor}.${newPatch}-${newPrerelease.join('.')}`
    : `${newMajor}.${newMinor}.${newPatch}`;

  return Object.freeze({
    major: newMajor,
    minor: newMinor,
    patch: newPatch,
    prerelease: Object.freeze(newPrerelease),
    build: Object.freeze([]),
    raw,
  });
}
