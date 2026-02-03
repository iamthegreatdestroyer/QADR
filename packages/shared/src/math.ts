/**
 * Math utilities.
 *
 * Helpers for numerical operations and statistics.
 */

/**
 * Clamp a value to a range.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another.
 *
 * @param value - Value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, t);
}

/**
 * Round to a specific number of decimal places.
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if two numbers are approximately equal.
 *
 * @param a - First value
 * @param b - Second value
 * @param epsilon - Tolerance (default: 1e-10)
 * @returns True if approximately equal
 */
export function approxEqual(
  a: number,
  b: number,
  epsilon: number = 1e-10
): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Calculate mean (average) of numbers.
 *
 * @param values - Array of numbers
 * @returns Mean value
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate median of numbers.
 *
 * @param values - Array of numbers
 * @returns Median value
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Calculate mode(s) of numbers.
 *
 * @param values - Array of numbers
 * @returns Array of mode values
 */
export function mode(values: readonly number[]): number[] {
  if (values.length === 0) return [];

  const counts = new Map<number, number>();
  let maxCount = 0;

  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    maxCount = Math.max(maxCount, count);
  }

  const modes: number[] = [];
  for (const [value, count] of counts) {
    if (count === maxCount) {
      modes.push(value);
    }
  }

  return modes.sort((a, b) => a - b);
}

/**
 * Calculate variance of numbers.
 *
 * @param values - Array of numbers
 * @param population - Whether to use population variance (N) vs sample (N-1)
 * @returns Variance
 */
export function variance(
  values: readonly number[],
  population: boolean = false
): number {
  const n = values.length;
  if (n === 0) return NaN;
  if (n === 1) return 0;

  const avg = mean(values);
  const sumSquares = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0);

  return sumSquares / (population ? n : n - 1);
}

/**
 * Calculate standard deviation of numbers.
 *
 * @param values - Array of numbers
 * @param population - Whether to use population std dev (N) vs sample (N-1)
 * @returns Standard deviation
 */
export function stdDev(
  values: readonly number[],
  population: boolean = false
): number {
  return Math.sqrt(variance(values, population));
}

/**
 * Calculate percentile of a sorted array.
 *
 * @param sorted - Sorted array of numbers
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (p <= 0) return sorted[0]!;
  if (p >= 100) return sorted[sorted.length - 1]!;

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/**
 * Calculate quartiles of numbers.
 *
 * @param values - Array of numbers
 * @returns [Q1, Q2 (median), Q3]
 */
export function quartiles(values: readonly number[]): [number, number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  return [
    percentile(sorted, 25),
    percentile(sorted, 50),
    percentile(sorted, 75),
  ];
}

/**
 * Calculate interquartile range (IQR).
 *
 * @param values - Array of numbers
 * @returns IQR (Q3 - Q1)
 */
export function iqr(values: readonly number[]): number {
  const [q1, , q3] = quartiles(values);
  return q3 - q1;
}

/**
 * Calculate min and max of numbers.
 *
 * @param values - Array of numbers
 * @returns [min, max]
 */
export function minMax(values: readonly number[]): [number, number] {
  if (values.length === 0) return [NaN, NaN];

  let min = Infinity;
  let max = -Infinity;

  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return [min, max];
}

/**
 * Generate a random number in a range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive for int, inclusive for float)
 * @param random - Random function (defaults to Math.random)
 * @returns Random number
 */
export function randomInRange(
  min: number,
  max: number,
  random: () => number = Math.random
): number {
  return min + random() * (max - min);
}

/**
 * Generate a random integer in a range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param random - Random function (defaults to Math.random)
 * @returns Random integer
 */
export function randomInt(
  min: number,
  max: number,
  random: () => number = Math.random
): number {
  return Math.floor(randomInRange(min, max + 1, random));
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * @param seed - Seed value
 * @returns Random function that returns 0-1
 */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normalize a value to 0-1 range.
 *
 * @param value - Value to normalize
 * @param min - Minimum of range
 * @param max - Maximum of range
 * @returns Normalized value (0-1)
 */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0;
  return (value - min) / (max - min);
}

/**
 * Sigmoid function (logistic).
 *
 * @param x - Input value
 * @returns Output in (0, 1)
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Softmax function for array of values.
 *
 * @param values - Array of numbers
 * @returns Probabilities that sum to 1
 */
export function softmax(values: readonly number[]): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Greatest common divisor (Euclidean algorithm).
 *
 * @param a - First number
 * @param b - Second number
 * @returns GCD
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Least common multiple.
 *
 * @param a - First number
 * @param b - Second number
 * @returns LCM
 */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Check if a number is prime.
 *
 * @param n - Number to check
 * @returns True if prime
 */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;

  const sqrt = Math.sqrt(n);
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) return false;
  }

  return true;
}

/**
 * Factorial (n!).
 *
 * @param n - Non-negative integer
 * @returns n!
 */
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('Factorial requires non-negative integer');
  }

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Binomial coefficient (n choose k).
 *
 * @param n - Total items
 * @param k - Items to choose
 * @returns C(n, k)
 */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  // Optimize by using smaller k
  if (k > n - k) {
    k = n - k;
  }

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}
