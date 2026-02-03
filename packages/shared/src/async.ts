/**
 * Async utilities.
 *
 * Helpers for working with async operations, concurrency control,
 * and promise patterns.
 */

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true.
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Polling options
 * @returns Promise that resolves when condition is met
 * @throws Error if timeout is reached
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout: ${message}`);
}

/**
 * Retry an operation with exponential backoff.
 *
 * @param operation - Async operation to retry
 * @param options - Retry options
 * @returns Result of the operation
 * @throws Last error if all retries fail
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 10000,
    factor = 2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      onRetry?.(error, attempt);
      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Add timeout to a promise.
 *
 * @param promise - Promise to wrap
 * @param ms - Timeout in milliseconds
 * @param message - Error message on timeout
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/**
 * Run promises in parallel with concurrency limit.
 *
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Maximum concurrent operations
 * @returns Results in order
 */
export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = Infinity
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const worker = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index]!;
      results[index] = await fn(item, index);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

/**
 * Run promises in series.
 *
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @returns Results in order
 */
export async function pSeries<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  return pMap(items, fn, 1);
}

/**
 * Collect promises into settled results.
 *
 * @param promises - Object of promises
 * @returns Object with settled results
 */
export async function pProps<T extends Record<string, Promise<unknown>>>(
  promises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(promises) as (keyof T)[];
  const values = await Promise.all(keys.map((k) => promises[k]));

  const result = {} as { [K in keyof T]: Awaited<T[K]> };
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]!] = values[i] as Awaited<T[keyof T]>;
  }

  return result;
}

/**
 * Create a deferred promise.
 *
 * @returns Object with promise and resolve/reject functions
 */
export function defer<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Create an async queue for sequential processing.
 */
export class AsyncQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;

  /**
   * Add an operation to the queue.
   *
   * @param fn - Operation to queue
   * @returns Promise that resolves when operation completes
   */
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      await operation();
    }

    this.processing = false;
  }

  /** Current queue length. */
  get length(): number {
    return this.queue.length;
  }

  /** Whether queue is currently processing. */
  get isProcessing(): boolean {
    return this.processing;
  }
}

/**
 * Create a debounced async function.
 *
 * @param fn - Function to debounce
 * @param ms - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<Awaited<ReturnType<T>>> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((reason: unknown) => void) | null = null;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }

    timeoutId = setTimeout(async () => {
      try {
        const result = await fn(...args);
        pendingResolve?.(result as Awaited<ReturnType<T>>);
      } catch (error) {
        pendingReject?.(error);
      } finally {
        pendingPromise = null;
        pendingResolve = null;
        pendingReject = null;
        timeoutId = null;
      }
    }, ms);

    return pendingPromise;
  };
}

/**
 * Create a throttled async function.
 *
 * @param fn - Function to throttle
 * @param ms - Minimum interval between calls
 * @returns Throttled function
 */
export function throttleAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let lastCall = 0;
  let pendingPromise: Promise<Awaited<ReturnType<T>>> | null = null;

  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= ms) {
      lastCall = now;
      return fn(...args) as Promise<Awaited<ReturnType<T>>>;
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        setTimeout(async () => {
          lastCall = Date.now();
          const result = await fn(...args);
          pendingPromise = null;
          resolve(result as Awaited<ReturnType<T>>);
        }, ms - timeSinceLastCall);
      });
    }

    return pendingPromise;
  };
}
