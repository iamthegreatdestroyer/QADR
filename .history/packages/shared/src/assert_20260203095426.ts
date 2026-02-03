/**
 * Assertion utilities.
 *
 * Runtime type checking and validation helpers.
 */

/**
 * Assert that a condition is true.
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 * @throws Error if condition is false
 */
export function assert(
  condition: boolean,
  message: string = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is not null or undefined.
 *
 * @param value - Value to check
 * @param message - Error message if value is nullish
 * @returns The value with null/undefined removed from type
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Expected value to be defined'
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Assert that a value is never reached (exhaustiveness check).
 *
 * @param value - Value that should never exist
 * @param message - Error message
 * @throws Error always
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(
    message ?? `Unexpected value: ${JSON.stringify(value)}`
  );
}

/**
 * Assert that a value is a string.
 */
export function assertString(
  value: unknown,
  message: string = 'Expected a string'
): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(message);
  }
}

/**
 * Assert that a value is a number.
 */
export function assertNumber(
  value: unknown,
  message: string = 'Expected a number'
): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is a boolean.
 */
export function assertBoolean(
  value: unknown,
  message: string = 'Expected a boolean'
): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
}

/**
 * Assert that a value is an array.
 */
export function assertArray(
  value: unknown,
  message: string = 'Expected an array'
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is a plain object.
 */
export function assertObject(
  value: unknown,
  message: string = 'Expected an object'
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * Assert that a value is a function.
 */
export function assertFunction(
  value: unknown,
  message: string = 'Expected a function'
): asserts value is (...args: unknown[]) => unknown {
  if (typeof value !== 'function') {
    throw new Error(message);
  }
}

/**
 * Assert that a number is in a range (inclusive).
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): asserts value is number {
  if (value < min || value > max) {
    throw new Error(
      message ?? `Expected ${value} to be between ${min} and ${max}`
    );
  }
}

/**
 * Assert that a number is positive.
 */
export function assertPositive(
  value: number,
  message?: string
): asserts value is number {
  if (value <= 0) {
    throw new Error(message ?? `Expected ${value} to be positive`);
  }
}

/**
 * Assert that a number is non-negative.
 */
export function assertNonNegative(
  value: number,
  message?: string
): asserts value is number {
  if (value < 0) {
    throw new Error(message ?? `Expected ${value} to be non-negative`);
  }
}

/**
 * Assert that an array is not empty.
 */
export function assertNonEmpty<T>(
  value: readonly T[],
  message: string = 'Expected non-empty array'
): asserts value is readonly [T, ...T[]] {
  if (value.length === 0) {
    throw new Error(message);
  }
}

/**
 * Assert that a string is not empty.
 */
export function assertNonEmptyString(
  value: string,
  message: string = 'Expected non-empty string'
): asserts value is string {
  if (value.length === 0) {
    throw new Error(message);
  }
}

/**
 * Assert that a value matches a pattern.
 */
export function assertMatches(
  value: string,
  pattern: RegExp,
  message?: string
): asserts value is string {
  if (!pattern.test(value)) {
    throw new Error(
      message ?? `Expected "${value}" to match pattern ${pattern}`
    );
  }
}
