/**
 * @qadr/semver - Semantic versioning utilities
 *
 * @packageDocumentation
 */

// Types
export type {
  ISemVer,
  IVersionConstraint,
  IVersionRange,
  IComparator,
  ConstraintOperator,
  CompareResult,
  SortOrder,
  IParseOptions,
  ISatisfiesOptions,
} from './types.js';

// Parsing
export {
  parse,
  isValid,
  coerce,
  format,
  major,
  minor,
  increment,
} from './parse.js';

// Comparison
export {
  compare,
  compareSemVer,
  gt,
  gte,
  lt,
  lte,
  eq,
  neq,
  sort,
  sortSemVer,
  min,
  max,
  diff,
} from './compare.js';

// Constraints
export {
  parseConstraint,
  satisfies,
  satisfiesSemVer,
  maxSatisfying,
  minSatisfying,
  filter,
  isValidConstraint,
} from './constraint.js';
