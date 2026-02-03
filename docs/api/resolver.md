# @qadr/core - Resolver

The resolver is the heart of QADR, implementing the quantum-annealing-inspired
dependency resolution algorithm.

## Installation

```bash
npm install @qadr/core
```

## Basic Usage

```typescript
import { Resolver, createResolver } from '@qadr/core';

const resolver = createResolver({
  registry: 'https://registry.npmjs.org',
});

const result = await resolver.resolve({
  dependencies: {
    react: '^18.0.0',
    lodash: '^4.0.0',
  },
});

console.log(result.packages);
```

## API Reference

### `createResolver(options?)`

Create a new resolver instance.

```typescript
function createResolver(options?: ResolverOptions): Resolver;
```

**Parameters:**

| Parameter | Type              | Description            |
| --------- | ----------------- | ---------------------- |
| `options` | `ResolverOptions` | Optional configuration |

**Returns:** `Resolver` instance.

### `ResolverOptions`

```typescript
interface ResolverOptions {
  /** Registry URL */
  registry?: string;

  /** Authentication token */
  token?: string;

  /** Enable caching */
  cache?: boolean;

  /** Cache directory */
  cacheDir?: string;

  /** Maximum concurrent requests */
  concurrency?: number;

  /** Request timeout in ms */
  timeout?: number;

  /** Resolution strategy */
  strategy?: 'quantum-annealing' | 'greedy' | 'backtracking';

  /** Annealing parameters */
  annealing?: AnnealingOptions;

  /** Event hooks */
  hooks?: ResolverHooks;
}
```

### `AnnealingOptions`

```typescript
interface AnnealingOptions {
  /** Initial temperature */
  temperature?: number;

  /** Cooling rate (0-1) */
  coolingRate?: number;

  /** Maximum iterations */
  maxIterations?: number;

  /** Minimum temperature to stop */
  minTemperature?: number;

  /** Random seed for reproducibility */
  seed?: number;

  /** Number of parallel workers */
  parallelism?: number | 'auto';
}
```

### `Resolver`

The main resolver class.

#### `resolve(manifest)`

Resolve dependencies for a manifest.

```typescript
async resolve(manifest: Manifest): Promise<ResolutionResult>;
```

**Parameters:**

| Parameter  | Type       | Description                 |
| ---------- | ---------- | --------------------------- |
| `manifest` | `Manifest` | Package manifest to resolve |

**Returns:** `Promise<ResolutionResult>`

**Example:**

```typescript
const result = await resolver.resolve({
  name: 'my-app',
  version: '1.0.0',
  dependencies: {
    react: '^18.0.0',
  },
  devDependencies: {
    typescript: '^5.0.0',
  },
});
```

#### `analyze(manifest)`

Analyze dependencies without full resolution.

```typescript
async analyze(manifest: Manifest): Promise<AnalysisResult>;
```

#### `audit(manifest)`

Check for security vulnerabilities.

```typescript
async audit(manifest: Manifest): Promise<AuditResult>;
```

### `ResolutionResult`

```typescript
interface ResolutionResult {
  /** Resolved packages */
  packages: ResolvedPackage[];

  /** Resolution statistics */
  stats: ResolutionStats;

  /** Warnings encountered */
  warnings: Warning[];

  /** Whether resolution was successful */
  success: boolean;
}

interface ResolvedPackage {
  /** Package name */
  name: string;

  /** Resolved version */
  version: string;

  /** Package integrity hash */
  integrity: string;

  /** Tarball URL */
  resolved: string;

  /** Dependencies of this package */
  dependencies?: Record<string, string>;

  /** Whether this is a dev dependency */
  dev?: boolean;

  /** Whether this is optional */
  optional?: boolean;
}

interface ResolutionStats {
  /** Total packages resolved */
  total: number;

  /** Resolution time in ms */
  time: number;

  /** Production dependencies */
  production: number;

  /** Development dependencies */
  development: number;

  /** Iterations performed (for annealing) */
  iterations?: number;

  /** Final energy (for annealing) */
  finalEnergy?: number;
}
```

## Advanced Usage

### Custom Registry

```typescript
const resolver = createResolver({
  registry: 'https://npm.mycompany.com',
  token: process.env.NPM_TOKEN,
});
```

### Reproducible Builds

```typescript
const resolver = createResolver({
  annealing: {
    seed: 12345, // Fixed seed for reproducibility
  },
});
```

### Event Hooks

```typescript
const resolver = createResolver({
  hooks: {
    onPackageFetch: (name, version) => {
      console.log(`Fetching ${name}@${version}`);
    },
    onResolutionStart: () => {
      console.log('Resolution started');
    },
    onResolutionEnd: (result) => {
      console.log(`Resolved ${result.stats.total} packages`);
    },
    onConflict: (conflict) => {
      console.warn(`Conflict: ${conflict.package}`);
    },
  },
});
```

### Caching

```typescript
const resolver = createResolver({
  cache: true,
  cacheDir: '.qadr-cache',
});

// Clear cache
await resolver.clearCache();

// Get cache stats
const cacheStats = await resolver.getCacheStats();
console.log(cacheStats.size, cacheStats.entries);
```

## Error Handling

```typescript
import {
  ResolverError,
  NetworkError,
  ResolutionFailedError,
  CircularDependencyError,
} from '@qadr/core';

try {
  const result = await resolver.resolve(manifest);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof CircularDependencyError) {
    console.error('Circular dependency:', error.cycle);
  } else if (error instanceof ResolutionFailedError) {
    console.error('Resolution failed:', error.conflicts);
  }
}
```

## Performance Tips

1. **Enable caching** for repeated resolutions
2. **Increase concurrency** for faster registry fetches
3. **Use a seed** for reproducible builds
4. **Tune annealing parameters** for your project size
