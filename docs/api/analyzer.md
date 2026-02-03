# @qadr/core - Analyzer

The analyzer provides deep insights into your dependency graph without
performing full resolution.

## Installation

```bash
npm install @qadr/core
```

## Basic Usage

```typescript
import { Analyzer, createAnalyzer } from '@qadr/core';

const analyzer = createAnalyzer();

const result = await analyzer.analyze({
  dependencies: {
    react: '^18.0.0',
    lodash: '^4.0.0',
  },
});

console.log(result.stats);
console.log(result.vulnerabilities);
```

## API Reference

### `createAnalyzer(options?)`

Create a new analyzer instance.

```typescript
function createAnalyzer(options?: AnalyzerOptions): Analyzer;
```

**Parameters:**

| Parameter | Type              | Description            |
| --------- | ----------------- | ---------------------- |
| `options` | `AnalyzerOptions` | Optional configuration |

**Returns:** `Analyzer` instance.

### `AnalyzerOptions`

```typescript
interface AnalyzerOptions {
  /** Registry URL */
  registry?: string;

  /** Enable caching */
  cache?: boolean;

  /** Cache directory */
  cacheDir?: string;

  /** Maximum depth to analyze */
  maxDepth?: number;

  /** Include dev dependencies */
  includeDev?: boolean;

  /** Include optional dependencies */
  includeOptional?: boolean;

  /** Vulnerability database URL */
  advisoryDatabase?: string;
}
```

### `Analyzer`

The main analyzer class.

#### `analyze(manifest)`

Analyze a package manifest.

```typescript
async analyze(manifest: Manifest): Promise<AnalysisResult>;
```

**Parameters:**

| Parameter  | Type       | Description                 |
| ---------- | ---------- | --------------------------- |
| `manifest` | `Manifest` | Package manifest to analyze |

**Returns:** `Promise<AnalysisResult>`

#### `auditPackage(name, version)`

Audit a specific package for vulnerabilities.

```typescript
async auditPackage(
  name: string,
  version: string
): Promise<Vulnerability[]>;
```

#### `getOutdated(manifest)`

Get list of outdated packages.

```typescript
async getOutdated(manifest: Manifest): Promise<OutdatedPackage[]>;
```

#### `getDuplicates(manifest)`

Find duplicate packages in the dependency tree.

```typescript
async getDuplicates(manifest: Manifest): Promise<DuplicatePackage[]>;
```

### `AnalysisResult`

```typescript
interface AnalysisResult {
  /** Dependency statistics */
  stats: DependencyStats;

  /** Dependency tree */
  tree: DependencyTree;

  /** Security vulnerabilities */
  vulnerabilities: Vulnerability[];

  /** Outdated packages */
  outdated: OutdatedPackage[];

  /** Duplicate packages */
  duplicates: DuplicatePackage[];

  /** License information */
  licenses: LicenseInfo[];

  /** Analysis warnings */
  warnings: AnalysisWarning[];
}

interface DependencyStats {
  /** Total dependencies */
  total: number;

  /** Production dependencies */
  production: number;

  /** Development dependencies */
  development: number;

  /** Optional dependencies */
  optional: number;

  /** Maximum tree depth */
  maxDepth: number;

  /** Total download size (bytes) */
  size: number;
}

interface DependencyTree {
  /** Package name */
  name: string;

  /** Package version */
  version: string;

  /** Child dependencies */
  dependencies: DependencyTree[];
}
```

### `Vulnerability`

```typescript
interface Vulnerability {
  /** Affected package name */
  package: string;

  /** Affected version */
  version: string;

  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Advisory ID (e.g., GHSA-xxxx) */
  advisoryId: string;

  /** Advisory title */
  title: string;

  /** Advisory URL */
  url: string;

  /** Patched versions (if available) */
  patchedVersions?: string;

  /** CVSS score */
  cvss?: number;

  /** CWE identifier */
  cwe?: string;
}
```

### `OutdatedPackage`

```typescript
interface OutdatedPackage {
  /** Package name */
  name: string;

  /** Current version */
  current: string;

  /** Latest version */
  latest: string;

  /** Wanted version (satisfies constraint) */
  wanted: string;

  /** Whether update is a breaking change */
  breaking: boolean;

  /** Dependency type */
  type: 'production' | 'development' | 'optional';
}
```

## Advanced Usage

### Depth-Limited Analysis

```typescript
const analyzer = createAnalyzer({
  maxDepth: 3, // Only analyze 3 levels deep
});
```

### Production Only

```typescript
const analyzer = createAnalyzer({
  includeDev: false,
  includeOptional: false,
});
```

### Custom Advisory Database

```typescript
const analyzer = createAnalyzer({
  advisoryDatabase: 'https://advisories.mycompany.com/api',
});
```

### Streaming Analysis

For large dependency trees:

```typescript
const stream = analyzer.analyzeStream(manifest);

stream.on('package', (pkg) => {
  console.log(`Analyzing: ${pkg.name}@${pkg.version}`);
});

stream.on('vulnerability', (vuln) => {
  console.warn(`Found: ${vuln.advisoryId}`);
});

stream.on('complete', (result) => {
  console.log('Analysis complete');
});
```

## Examples

### Security Audit

```typescript
const result = await analyzer.analyze(manifest);

const critical = result.vulnerabilities.filter(
  (v) => v.severity === 'critical'
);

if (critical.length > 0) {
  console.error('Critical vulnerabilities found!');
  process.exit(1);
}
```

### License Compliance

```typescript
const result = await analyzer.analyze(manifest);

const gplLicenses = result.licenses.filter((l) => l.license.includes('GPL'));

if (gplLicenses.length > 0) {
  console.warn('GPL-licensed packages found:', gplLicenses);
}
```

### Dependency Tree Visualization

```typescript
function printTree(tree: DependencyTree, indent = 0) {
  console.log('  '.repeat(indent) + `${tree.name}@${tree.version}`);
  for (const dep of tree.dependencies) {
    printTree(dep, indent + 1);
  }
}

const result = await analyzer.analyze(manifest);
printTree(result.tree);
```
