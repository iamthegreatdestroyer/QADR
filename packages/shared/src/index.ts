/**
 * @qadr/shared - Shared utilities
 *
 * @packageDocumentation
 */

// Types
export type {
  DeepPartial,
  DeepReadonly,
  ElementOf,
  RequireKeys,
  OptionalKeys,
  Merge,
  ValueOf,
  MaybePromise,
  AsyncOrSync,
  Result,
  Brand,
  Opaque,
  PositiveInteger,
  NonEmptyString,
  Percentage,
} from './types.js';

export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  mapResult,
  mapError,
  positiveInteger,
  nonEmptyString,
  percentage,
} from './types.js';

// Assertions
export {
  assert,
  assertDefined,
  assertNever,
  assertString,
  assertNumber,
  assertBoolean,
  assertArray,
  assertObject,
  assertFunction,
  assertInRange,
  assertPositive,
  assertNonNegative,
  assertNonEmpty,
  assertNonEmptyString,
  assertMatches,
} from './assert.js';

// Async utilities
export {
  sleep,
  waitFor,
  retry,
  withTimeout,
  pMap,
  pSeries,
  pProps,
  defer,
  AsyncQueue,
  debounceAsync,
  throttleAsync,
} from './async.js';

// Collection utilities
export {
  groupBy,
  keyBy,
  fromPairs,
  toPairs,
  unique,
  partition,
  flatten,
  range,
  chunk,
  first,
  last,
  minBy,
  maxBy,
  sum,
  sumBy,
  average,
  countBy,
  zip,
  shuffle,
  sample,
  sampleSize,
} from './collections.js';

// Math utilities
export {
  clamp,
  lerp,
  mapRange,
  round,
  approxEqual,
  mean,
  median,
  mode,
  variance,
  stdDev,
  percentile,
  quartiles,
  iqr,
  minMax,
  randomInRange,
  randomInt,
  seededRandom,
  normalize,
  sigmoid,
  softmax,
  gcd,
  lcm,
  isPrime,
  factorial,
  binomial,
} from './math.js';

// String utilities
export {
  isBlank,
  isNotBlank,
  capitalize,
  uncapitalize,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
  truncate,
  padLeft,
  padRight,
  center,
  repeat,
  normalizeWhitespace,
  lines,
  count,
  escapeHtml,
  unescapeHtml,
  escapeRegExp,
  randomString,
  slugify,
  template,
  wordWrap,
  indent,
  dedent,
} from './strings.js';

// Logging
export type { LogLevel, ILogEntry, ILogTransport, ILoggerOptions } from './logger.js';
export {
  LOG_LEVELS,
  Logger,
  ConsoleTransport,
  JsonTransport,
  BufferedTransport,
  logger,
  createLogger,
} from './logger.js';
