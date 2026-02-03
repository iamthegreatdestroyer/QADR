/**
 * Collection utilities.
 *
 * Helpers for working with arrays, maps, and sets.
 */

/**
 * Group array items by a key.
 *
 * @param items - Items to group
 * @param keyFn - Function to extract key from item
 * @returns Map of key to items
 */
export function groupBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const result = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = result.get(key);

    if (group) {
      group.push(item);
    } else {
      result.set(key, [item]);
    }
  }

  return result;
}

/**
 * Create an object from array using key extractor.
 *
 * @param items - Items to convert
 * @param keyFn - Function to extract key from item
 * @returns Object with items keyed by extracted key
 */
export function keyBy<T, K extends string | number>(
  items: readonly T[],
  keyFn: (item: T) => K
): Record<K, T> {
  const result = {} as Record<K, T>;

  for (const item of items) {
    const key = keyFn(item);
    result[key] = item;
  }

  return result;
}

/**
 * Create an object from array of key-value pairs.
 *
 * @param pairs - Array of [key, value] pairs
 * @returns Object from pairs
 */
export function fromPairs<K extends string | number, V>(
  pairs: readonly (readonly [K, V])[]
): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of pairs) {
    result[key] = value;
  }

  return result;
}

/**
 * Convert object to array of key-value pairs.
 *
 * @param obj - Object to convert
 * @returns Array of [key, value] pairs
 */
export function toPairs<K extends string, V>(
  obj: Record<K, V>
): [K, V][] {
  return Object.entries(obj) as [K, V][];
}

/**
 * Remove duplicate items from array.
 *
 * @param items - Items with potential duplicates
 * @param keyFn - Optional function to extract comparison key
 * @returns Array with duplicates removed
 */
export function unique<T>(
  items: readonly T[],
  keyFn?: (item: T) => unknown
): T[] {
  if (!keyFn) {
    return [...new Set(items)];
  }

  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Partition array into two arrays based on predicate.
 *
 * @param items - Items to partition
 * @param predicate - Function to test each item
 * @returns [truthy items, falsy items]
 */
export function partition<T>(
  items: readonly T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of items) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * Flatten nested arrays one level deep.
 *
 * @param items - Array of arrays
 * @returns Flattened array
 */
export function flatten<T>(items: readonly (readonly T[])[]): T[] {
  return items.flat();
}

/**
 * Create a range of numbers.
 *
 * @param start - Start value (inclusive)
 * @param end - End value (exclusive)
 * @param step - Step between values
 * @returns Array of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];

  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }

  return result;
}

/**
 * Chunk array into smaller arrays.
 *
 * @param items - Items to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error('Chunk size must be at least 1');
  }

  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

/**
 * Get first item from array.
 *
 * @param items - Array
 * @returns First item or undefined
 */
export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

/**
 * Get last item from array.
 *
 * @param items - Array
 * @returns Last item or undefined
 */
export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

/**
 * Find item with minimum value.
 *
 * @param items - Items to search
 * @param valueFn - Function to extract value
 * @returns Item with minimum value, or undefined
 */
export function minBy<T>(
  items: readonly T[],
  valueFn: (item: T) => number
): T | undefined {
  if (items.length === 0) return undefined;

  let minItem = items[0];
  let minValue = valueFn(minItem!);

  for (let i = 1; i < items.length; i++) {
    const item = items[i]!;
    const value = valueFn(item);

    if (value < minValue) {
      minItem = item;
      minValue = value;
    }
  }

  return minItem;
}

/**
 * Find item with maximum value.
 *
 * @param items - Items to search
 * @param valueFn - Function to extract value
 * @returns Item with maximum value, or undefined
 */
export function maxBy<T>(
  items: readonly T[],
  valueFn: (item: T) => number
): T | undefined {
  if (items.length === 0) return undefined;

  let maxItem = items[0];
  let maxValue = valueFn(maxItem!);

  for (let i = 1; i < items.length; i++) {
    const item = items[i]!;
    const value = valueFn(item);

    if (value > maxValue) {
      maxItem = item;
      maxValue = value;
    }
  }

  return maxItem;
}

/**
 * Sum values in array.
 *
 * @param items - Numbers to sum
 * @returns Sum
 */
export function sum(items: readonly number[]): number {
  return items.reduce((acc, n) => acc + n, 0);
}

/**
 * Sum values in array using value extractor.
 *
 * @param items - Items to sum
 * @param valueFn - Function to extract value
 * @returns Sum
 */
export function sumBy<T>(
  items: readonly T[],
  valueFn: (item: T) => number
): number {
  return items.reduce((acc, item) => acc + valueFn(item), 0);
}

/**
 * Calculate average of numbers.
 *
 * @param items - Numbers to average
 * @returns Average, or NaN if empty
 */
export function average(items: readonly number[]): number {
  return items.length === 0 ? NaN : sum(items) / items.length;
}

/**
 * Count occurrences of each value.
 *
 * @param items - Items to count
 * @returns Map of value to count
 */
export function countBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K
): Map<K, number> {
  const counts = new Map<K, number>();

  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/**
 * Zip two arrays together.
 *
 * @param a - First array
 * @param b - Second array
 * @returns Array of pairs
 */
export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  const length = Math.min(a.length, b.length);
  const result: [A, B][] = [];

  for (let i = 0; i < length; i++) {
    result.push([a[i]!, b[i]!]);
  }

  return result;
}

/**
 * Shuffle array in place (Fisher-Yates).
 *
 * @param items - Array to shuffle
 * @param random - Random function (defaults to Math.random)
 * @returns Same array, shuffled
 */
export function shuffle<T>(
  items: T[],
  random: () => number = Math.random
): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/**
 * Pick random item from array.
 *
 * @param items - Array to pick from
 * @param random - Random function (defaults to Math.random)
 * @returns Random item, or undefined if empty
 */
export function sample<T>(
  items: readonly T[],
  random: () => number = Math.random
): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

/**
 * Pick n random items from array.
 *
 * @param items - Array to pick from
 * @param n - Number of items to pick
 * @param random - Random function (defaults to Math.random)
 * @returns Array of random items
 */
export function sampleSize<T>(
  items: readonly T[],
  n: number,
  random: () => number = Math.random
): T[] {
  const copy = [...items];
  shuffle(copy, random);
  return copy.slice(0, Math.min(n, items.length));
}
