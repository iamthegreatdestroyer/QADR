# @qadr/shared

> Shared utilities and common functionality for the QADR monorepo.

## Overview

This package provides foundational utilities used throughout all QADR packages,
including:

- **Type Utilities** - Advanced TypeScript type helpers and Result monad
- **Assertions** - Runtime type checking with TypeScript type narrowing
- **Async Helpers** - Concurrency control, retry logic, rate limiting
- **Collections** - Array, Map, and Set manipulation utilities
- **Math Functions** - Statistical analysis and numerical operations
- **String Utilities** - Formatting, case conversion, text manipulation
- **Logging** - Configurable, transport-based logging system

## Installation

```bash
pnpm add @qadr/shared
```

## Usage

### Result Type (Functional Error Handling)

```typescript
import { ok, err, isOk, unwrap, mapResult } from '@qadr/shared';
import type { Result } from '@qadr/shared';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

const result = divide(10, 2);

if (isOk(result)) {
  console.log('Result:', unwrap(result)); // 5
}

// Chain operations
const doubled = mapResult(result, (n) => n * 2);
```

### Branded Types (Nominal Typing)

```typescript
import {
  PositiveInteger,
  NonEmptyString,
  Percentage,
  isPositiveInteger,
  isNonEmptyString,
  isPercentage,
} from '@qadr/shared';

function processScore(score: PositiveInteger, name: NonEmptyString): void {
  // Type-safe: can only be called with validated values
}

const score = 95;
const name = 'Alice';

if (isPositiveInteger(score) && isNonEmptyString(name)) {
  processScore(score, name); // ✓ Type-safe
}
```

### Assertions

```typescript
import {
  assert,
  assertDefined,
  assertNever,
  assertString,
  assertPositive,
  assertNonEmpty,
} from '@qadr/shared';

function processValue(value: unknown): string {
  assertString(value, 'Expected string value');
  return value.toUpperCase(); // TypeScript knows value is string
}

function exhaustiveCheck(action: 'create' | 'update' | 'delete'): void {
  switch (action) {
    case 'create':
      return handleCreate();
    case 'update':
      return handleUpdate();
    case 'delete':
      return handleDelete();
    default:
      assertNever(action); // Compile error if case is missing
  }
}
```

### Async Utilities

```typescript
import {
  retry,
  withTimeout,
  pMap,
  debounceAsync,
  AsyncQueue,
  sleep,
} from '@qadr/shared';

// Retry with exponential backoff
const data = await retry(() => fetchData(), {
  maxAttempts: 5,
  initialDelay: 100,
  maxDelay: 5000,
  backoff: 2,
  shouldRetry: (error) => error.code !== 'FATAL',
});

// Add timeout to any promise
const result = await withTimeout(fetchData(), 5000);

// Parallel map with concurrency limit
const results = await pMap(items, async (item) => processItem(item), {
  concurrency: 5,
});

// Async queue for sequential processing
const queue = new AsyncQueue<Task, Result>(async (task) => {
  return await processTask(task);
});

queue.enqueue(task1);
queue.enqueue(task2);
```

### Collections

```typescript
import {
  groupBy,
  keyBy,
  unique,
  partition,
  chunk,
  minBy,
  maxBy,
  shuffle,
  range,
} from '@qadr/shared';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'admin' },
];

// Group by role
const byRole = groupBy(users, (u) => u.role);
// { admin: [{...}, {...}], user: [{...}] }

// Key by id
const byId = keyBy(users, (u) => u.id);
// { 1: {...}, 2: {...}, 3: {...} }

// Partition into admins and non-admins
const [admins, others] = partition(users, (u) => u.role === 'admin');

// Generate range
const nums = range(1, 10); // [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Chunk array
const chunks = chunk(nums, 3); // [[1,2,3], [4,5,6], [7,8,9]]
```

### Math & Statistics

```typescript
import {
  clamp,
  lerp,
  mean,
  median,
  stdDev,
  percentile,
  randomInt,
  seededRandom,
} from '@qadr/shared';

const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log(mean(values)); // 5.5
console.log(median(values)); // 5.5
console.log(stdDev(values)); // ~2.87
console.log(percentile(values, 90)); // 9

// Clamping
clamp(15, 0, 10); // 10
clamp(-5, 0, 10); // 0

// Linear interpolation
lerp(0, 100, 0.5); // 50

// Seeded random (reproducible)
const rng = seededRandom(12345);
console.log(rng()); // Always same sequence
```

### String Utilities

```typescript
import {
  camelCase,
  snakeCase,
  kebabCase,
  truncate,
  slugify,
  template,
  wordWrap,
  dedent,
} from '@qadr/shared';

camelCase('hello world'); // 'helloWorld'
snakeCase('helloWorld'); // 'hello_world'
kebabCase('HelloWorld'); // 'hello-world'

truncate('Long text here', 10); // 'Long te...'

slugify('Hello World!'); // 'hello-world'

template('Hello, ${name}!', { name: 'Alice' }); // 'Hello, Alice!'

const wrapped = wordWrap('Long paragraph...', 80);
```

### Logging

```typescript
import {
  createLogger,
  ConsoleTransport,
  JsonTransport,
  BufferedTransport,
} from '@qadr/shared';

// Basic logger
const logger = createLogger('my-module');

logger.info('Application started');
logger.debug('Debug details', { userId: 123 });
logger.error('Something failed', { error: err });

// Custom configuration
const customLogger = createLogger('api', {
  level: 'debug',
  transports: [
    new ConsoleTransport({ colors: true }),
    new JsonTransport({ stream: fileStream }),
    new BufferedTransport(new JsonTransport(), {
      flushInterval: 5000,
      maxSize: 100,
    }),
  ],
});

// Child loggers (inherit config, add context)
const requestLogger = logger.child({ requestId: 'abc-123' });
requestLogger.info('Processing request');
```

## API Reference

### Types

| Export               | Description                              |
| -------------------- | ---------------------------------------- |
| `DeepPartial<T>`     | Recursively make all properties optional |
| `DeepReadonly<T>`    | Recursively make all properties readonly |
| `ElementOf<T>`       | Extract element type from array          |
| `RequireKeys<T, K>`  | Make specific keys required              |
| `OptionalKeys<T, K>` | Make specific keys optional              |
| `Merge<T, U>`        | Merge two object types                   |
| `Result<T, E>`       | Discriminated union for success/error    |
| `Brand<T, B>`        | Create branded/nominal type              |
| `PositiveInteger`    | Branded positive integer type            |
| `NonEmptyString`     | Branded non-empty string type            |
| `Percentage`         | Branded 0-100 number type                |

### Assertions

| Function                          | Description               |
| --------------------------------- | ------------------------- |
| `assert(condition, message?)`     | Basic assertion           |
| `assertDefined(value, message?)`  | Assert not null/undefined |
| `assertNever(value)`              | Exhaustiveness check      |
| `assertString(value, message?)`   | Assert string type        |
| `assertNumber(value, message?)`   | Assert number type        |
| `assertPositive(value, message?)` | Assert positive number    |
| `assertNonEmpty(arr, message?)`   | Assert non-empty array    |

### Async

| Function                   | Description                    |
| -------------------------- | ------------------------------ |
| `sleep(ms)`                | Promise-based delay            |
| `retry(fn, options)`       | Retry with exponential backoff |
| `withTimeout(promise, ms)` | Add timeout to promise         |
| `pMap(items, fn, options)` | Parallel map with concurrency  |
| `pSeries(fns)`             | Serial async execution         |
| `debounceAsync(fn, ms)`    | Debounce async function        |

### Collections

| Function                    | Description          |
| --------------------------- | -------------------- |
| `groupBy(arr, fn)`          | Group array by key   |
| `keyBy(arr, fn)`            | Index array by key   |
| `unique(arr, fn?)`          | Remove duplicates    |
| `partition(arr, predicate)` | Split by condition   |
| `chunk(arr, size)`          | Split into chunks    |
| `shuffle(arr)`              | Fisher-Yates shuffle |

### Math

| Function                 | Description            |
| ------------------------ | ---------------------- |
| `clamp(value, min, max)` | Constrain to range     |
| `lerp(start, end, t)`    | Linear interpolation   |
| `mean(values)`           | Arithmetic mean        |
| `median(values)`         | Statistical median     |
| `stdDev(values)`         | Standard deviation     |
| `percentile(values, p)`  | Percentile calculation |

### Strings

| Function              | Description            |
| --------------------- | ---------------------- |
| `camelCase(str)`      | Convert to camelCase   |
| `snakeCase(str)`      | Convert to snake_case  |
| `kebabCase(str)`      | Convert to kebab-case  |
| `truncate(str, len)`  | Truncate with ellipsis |
| `slugify(str)`        | URL-safe slug          |
| `template(str, vars)` | Simple templating      |

## License

AGPL-3.0-or-later - See [LICENSE](../../LICENSE) for details.
