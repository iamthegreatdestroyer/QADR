/**
 * Version constraint parsing and matching.
 *
 * Supports npm-style semver ranges including:
 * - Exact: 1.2.3, =1.2.3
 * - Comparators: >1.0.0, >=1.0.0, <2.0.0, <=2.0.0
 * - Caret: ^1.2.3 (compatible with)
 * - Tilde: ~1.2.3 (approximately equivalent)
 * - Hyphen ranges: 1.0.0 - 2.0.0
 * - X-ranges: 1.x, 1.2.*, 1.2.x
 * - OR ranges: >=1.0.0 <2.0.0 || >=3.0.0
 *
 * @example
 * ```typescript
 * import { satisfies, parseConstraint, maxSatisfying } from '@qadr/semver';
 *
 * satisfies('1.2.3', '^1.0.0'); // true
 * satisfies('2.0.0', '^1.0.0'); // false
 *
 * maxSatisfying(['1.0.0', '1.5.0', '2.0.0'], '^1.0.0'); // '1.5.0'
 * ```
 */

import type {
  ISemVer,
  IVersionConstraint,
  IVersionRange,
  IComparator,
  ConstraintOperator,
  ISatisfiesOptions,
} from './types.js';
import { parse } from './parse.js';
import { compareSemVer, sort } from './compare.js';

/**
 * Parse a version constraint string.
 *
 * @param constraint - Constraint string to parse
 * @returns Parsed constraint, or null if invalid
 */
export function parseConstraint(constraint: string): IVersionConstraint | null {
  const trimmed = constraint.trim();

  if (!trimmed || trimmed === '*' || trimmed === 'latest') {
    return {
      ranges: [{ comparators: [{ operator: '*', version: null }] }],
      raw: trimmed,
    };
  }

  // Split on || for OR ranges
  const orParts = trimmed.split(/\s*\|\|\s*/);
  const ranges: IVersionRange[] = [];

  for (const part of orParts) {
    const range = parseRange(part);
    if (!range) {
      return null;
    }
    ranges.push(range);
  }

  return { ranges: Object.freeze(ranges), raw: trimmed };
}

/**
 * Parse a single range (no OR).
 */
function parseRange(range: string): IVersionRange | null {
  const trimmed = range.trim();

  // Check for hyphen range: 1.0.0 - 2.0.0
  const hyphenMatch = /^([^\s]+)\s+-\s+([^\s]+)$/.exec(trimmed);
  if (hyphenMatch) {
    const lower = parse(hyphenMatch[1]!, { loose: true });
    const upper = parse(hyphenMatch[2]!, { loose: true });
    if (lower && upper) {
      return {
        comparators: [
          { operator: '>=', version: lower },
          { operator: '<=', version: upper },
        ],
      };
    }
    return null;
  }

  // Split on whitespace for AND comparators
  const parts = trimmed.split(/\s+/);
  const comparators: IComparator[] = [];

  for (const part of parts) {
    const comparator = parseComparator(part);
    if (!comparator) {
      return null;
    }
    comparators.push(...comparator);
  }

  return { comparators: Object.freeze(comparators) };
}

/**
 * Parse a single comparator (may expand to multiple for caret/tilde).
 */
function parseComparator(comparator: string): IComparator[] | null {
  const trimmed = comparator.trim();

  // Wildcard
  if (trimmed === '*' || trimmed === 'x' || trimmed === 'X') {
    return [{ operator: '*', version: null }];
  }

  // X-range: 1.x, 1.2.x, 1.*, 1.2.*
  const xRangeMatch = /^([0-9]+)(?:\.([0-9]+|x|X|\*))?(?:\.([0-9]+|x|X|\*))?$/.exec(trimmed);
  if (xRangeMatch) {
    const [, majorStr, minorStr, patchStr] = xRangeMatch;
    const major = parseInt(majorStr!, 10);

    if (!minorStr || minorStr === 'x' || minorStr === 'X' || minorStr === '*') {
      // 1.x -> >=1.0.0 <2.0.0
      return [
        { operator: '>=', version: createVersion(major, 0, 0) },
        { operator: '<', version: createVersion(major + 1, 0, 0) },
      ];
    }

    const minor = parseInt(minorStr, 10);

    if (!patchStr || patchStr === 'x' || patchStr === 'X' || patchStr === '*') {
      // 1.2.x -> >=1.2.0 <1.3.0
      return [
        { operator: '>=', version: createVersion(major, minor, 0) },
        { operator: '<', version: createVersion(major, minor + 1, 0) },
      ];
    }
  }

  // Caret: ^1.2.3
  if (trimmed.startsWith('^')) {
    const version = parse(trimmed.slice(1), { loose: true });
    if (!version) return null;
    return expandCaret(version);
  }

  // Tilde: ~1.2.3
  if (trimmed.startsWith('~')) {
    const rest = trimmed.startsWith('~>') ? trimmed.slice(2) : trimmed.slice(1);
    const version = parse(rest, { loose: true });
    if (!version) return null;
    return expandTilde(version);
  }

  // Operators: >=, <=, >, <, =, !=
  const operatorMatch = /^(>=|<=|>|<|!=|=)?(.+)$/.exec(trimmed);
  if (operatorMatch) {
    const [, op, versionStr] = operatorMatch;
    const version = parse(versionStr!, { loose: true });
    if (!version) return null;

    const operator = (op || '=') as ConstraintOperator;
    return [{ operator, version }];
  }

  return null;
}

/**
 * Expand caret constraint to range.
 * ^1.2.3 -> >=1.2.3 <2.0.0
 * ^0.2.3 -> >=0.2.3 <0.3.0
 * ^0.0.3 -> >=0.0.3 <0.0.4
 */
function expandCaret(version: ISemVer): IComparator[] {
  let upperMajor = version.major;
  let upperMinor = version.minor;
  let upperPatch = version.patch;

  if (version.major > 0) {
    upperMajor++;
    upperMinor = 0;
    upperPatch = 0;
  } else if (version.minor > 0) {
    upperMinor++;
    upperPatch = 0;
  } else {
    upperPatch++;
  }

  return [
    { operator: '>=', version },
    { operator: '<', version: createVersion(upperMajor, upperMinor, upperPatch) },
  ];
}

/**
 * Expand tilde constraint to range.
 * ~1.2.3 -> >=1.2.3 <1.3.0
 * ~1.2 -> >=1.2.0 <1.3.0
 * ~0.2.3 -> >=0.2.3 <0.3.0
 */
function expandTilde(version: ISemVer): IComparator[] {
  return [
    { operator: '>=', version },
    { operator: '<', version: createVersion(version.major, version.minor + 1, 0) },
  ];
}

/**
 * Create a simple version object.
 */
function createVersion(major: number, minor: number, patch: number): ISemVer {
  return Object.freeze({
    major,
    minor,
    patch,
    prerelease: Object.freeze([]),
    build: Object.freeze([]),
    raw: `${major}.${minor}.${patch}`,
  });
}

/**
 * Check if a version satisfies a single comparator.
 */
function satisfiesComparator(
  version: ISemVer,
  comparator: IComparator,
  options: ISatisfiesOptions = {}
): boolean {
  // Wildcard matches everything
  if (comparator.operator === '*' || !comparator.version) {
    return true;
  }

  // Handle prerelease versions
  if (!options.includePrerelease && version.prerelease.length > 0) {
    // Prerelease versions only match if the comparator has the same major.minor.patch
    const target = comparator.version;
    if (
      version.major !== target.major ||
      version.minor !== target.minor ||
      version.patch !== target.patch
    ) {
      return false;
    }
  }

  const cmp = compareSemVer(version, comparator.version);

  switch (comparator.operator) {
    case '=':
      return cmp === 0;
    case '!=':
      return cmp !== 0;
    case '>':
      return cmp === 1;
    case '>=':
      return cmp >= 0;
    case '<':
      return cmp === -1;
    case '<=':
      return cmp <= 0;
    default:
      return false;
  }
}

/**
 * Check if a version satisfies a range (all comparators must match).
 */
function satisfiesRange(
  version: ISemVer,
  range: IVersionRange,
  options: ISatisfiesOptions = {}
): boolean {
  return range.comparators.every((c) => satisfiesComparator(version, c, options));
}

/**
 * Check if a version string satisfies a constraint.
 *
 * @param version - Version string to test
 * @param constraint - Constraint string (e.g., "^1.0.0", ">=1.0.0 <2.0.0")
 * @param options - Satisfaction options
 * @returns True if version satisfies the constraint
 */
export function satisfies(
  version: string,
  constraint: string,
  options: ISatisfiesOptions = {}
): boolean {
  const versionParsed = parse(version, { loose: true });
  if (!versionParsed) {
    return false;
  }

  const constraintParsed = parseConstraint(constraint);
  if (!constraintParsed) {
    return false;
  }

  // Any range must match (OR)
  return constraintParsed.ranges.some((range) =>
    satisfiesRange(versionParsed, range, options)
  );
}

/**
 * Check if a semver object satisfies a parsed constraint.
 */
export function satisfiesSemVer(
  version: ISemVer,
  constraint: IVersionConstraint,
  options: ISatisfiesOptions = {}
): boolean {
  return constraint.ranges.some((range) =>
    satisfiesRange(version, range, options)
  );
}

/**
 * Find the maximum version that satisfies a constraint.
 *
 * @param versions - Array of version strings
 * @param constraint - Constraint string
 * @param options - Satisfaction options
 * @returns Maximum satisfying version, or null if none
 */
export function maxSatisfying(
  versions: readonly string[],
  constraint: string,
  options: ISatisfiesOptions = {}
): string | null {
  const sorted = sort(versions, 'desc');
  
  for (const version of sorted) {
    if (satisfies(version, constraint, options)) {
      return version;
    }
  }

  return null;
}

/**
 * Find the minimum version that satisfies a constraint.
 *
 * @param versions - Array of version strings
 * @param constraint - Constraint string
 * @param options - Satisfaction options
 * @returns Minimum satisfying version, or null if none
 */
export function minSatisfying(
  versions: readonly string[],
  constraint: string,
  options: ISatisfiesOptions = {}
): string | null {
  const sorted = sort(versions, 'asc');
  
  for (const version of sorted) {
    if (satisfies(version, constraint, options)) {
      return version;
    }
  }

  return null;
}

/**
 * Filter versions to those satisfying a constraint.
 *
 * @param versions - Array of version strings
 * @param constraint - Constraint string
 * @param options - Satisfaction options
 * @returns Array of satisfying versions
 */
export function filter(
  versions: readonly string[],
  constraint: string,
  options: ISatisfiesOptions = {}
): string[] {
  return versions.filter((v) => satisfies(v, constraint, options));
}

/**
 * Check if a constraint is valid.
 *
 * @param constraint - Constraint string to validate
 * @returns True if valid
 */
export function isValidConstraint(constraint: string): boolean {
  return parseConstraint(constraint) !== null;
}
