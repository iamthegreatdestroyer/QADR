/**
 * Shared utility types.
 *
 * Common type definitions used across all QADR packages.
 */

/**
 * Make all properties of T optional recursively.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Make all properties of T readonly recursively.
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Extract the element type from an array type.
 */
export type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Make specific keys of T required.
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys of T optional.
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Merge two types, with B taking precedence.
 */
export type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Get union of object values.
 */
export type ValueOf<T> = T[keyof T];

/**
 * Promise that can be awaited.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Function that returns a value or a promise.
 */
export type AsyncOrSync<T> = T | Promise<T>;

/**
 * Generic result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Create a success result.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create an error result.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Check if a result is successful.
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Check if a result is an error.
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Unwrap a result or throw the error.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a result or return default value.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Map a successful result.
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Map an error result.
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

/**
 * Brand type for nominal typing.
 */
declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

/**
 * Opaque type (alias for Brand).
 */
export type Opaque<T, TTag extends string> = Brand<T, TTag>;

/**
 * Positive integer (branded number).
 */
export type PositiveInteger = Brand<number, 'PositiveInteger'>;

/**
 * Non-empty string (branded string).
 */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

/**
 * Percentage (0-100 branded number).
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Validate and create a PositiveInteger.
 */
export function positiveInteger(n: number): PositiveInteger | null {
  if (Number.isInteger(n) && n > 0) {
    return n as PositiveInteger;
  }
  return null;
}

/**
 * Validate and create a NonEmptyString.
 */
export function nonEmptyString(s: string): NonEmptyString | null {
  if (s.length > 0) {
    return s as NonEmptyString;
  }
  return null;
}

/**
 * Validate and create a Percentage.
 */
export function percentage(n: number): Percentage | null {
  if (n >= 0 && n <= 100) {
    return n as Percentage;
  }
  return null;
}
