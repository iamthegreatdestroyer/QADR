/**
 * Semver types.
 *
 * Type definitions for semantic versioning operations.
 */

/**
 * Parsed semantic version.
 */
export interface ISemVer {
  /** Major version number */
  readonly major: number;
  /** Minor version number */
  readonly minor: number;
  /** Patch version number */
  readonly patch: number;
  /** Pre-release identifiers (e.g., ['alpha', '1']) */
  readonly prerelease: readonly string[];
  /** Build metadata (e.g., ['build', '123']) */
  readonly build: readonly string[];
  /** Original version string */
  readonly raw: string;
}

/**
 * Version constraint operators.
 */
export type ConstraintOperator =
  | '='    // Exact match
  | '!='   // Not equal
  | '>'    // Greater than
  | '>='   // Greater than or equal
  | '<'    // Less than
  | '<='   // Less than or equal
  | '^'    // Caret (compatible with)
  | '~'    // Tilde (approximately equivalent)
  | '~>'   // Pessimistic constraint (Ruby-style)
  | '*';   // Any version

/**
 * Single version comparator.
 */
export interface IComparator {
  /** Comparison operator */
  readonly operator: ConstraintOperator;
  /** Target version (null for wildcard) */
  readonly version: ISemVer | null;
}

/**
 * Version range (conjunction of comparators).
 */
export interface IVersionRange {
  /** Comparators that must all be satisfied (AND) */
  readonly comparators: readonly IComparator[];
}

/**
 * Parsed version constraint (disjunction of ranges).
 */
export interface IVersionConstraint {
  /** Version ranges, any of which can be satisfied (OR) */
  readonly ranges: readonly IVersionRange[];
  /** Original constraint string */
  readonly raw: string;
}

/**
 * Version comparison result.
 * -1: a < b
 *  0: a == b
 *  1: a > b
 */
export type CompareResult = -1 | 0 | 1;

/**
 * Sort direction for version lists.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Options for version parsing.
 */
export interface IParseOptions {
  /** Allow loose parsing (missing minor/patch defaults to 0) */
  readonly loose?: boolean;
  /** Include build metadata in comparisons */
  readonly includeBuild?: boolean;
}

/**
 * Options for constraint satisfaction.
 */
export interface ISatisfiesOptions {
  /** Include pre-release versions */
  readonly includePrerelease?: boolean;
}
