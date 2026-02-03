# @qadr/config

> Configuration loading and validation for QADR.

## Overview

This package provides comprehensive configuration management for QADR,
including:

- **Type-safe configuration** with full TypeScript support
- **Multiple file formats** (JSON, YAML, TOML, JavaScript, TypeScript)
- **Configuration inheritance** via `extends` property
- **Environment variable** support
- **Preset configurations** for common use cases
- **Zod-based validation** with helpful error messages

## Installation

```bash
pnpm add @qadr/config
```

## Quick Start

```typescript
import { loadConfig, DEFAULT_CONFIG } from '@qadr/config';

// Load configuration from current directory
const result = await loadConfig();

if (result.ok) {
  const { config, sources, rootDir } = result.value;
  console.log('Loaded from:', sources.map((s) => s.path).join(', '));
  console.log('Config:', config);
} else {
  console.error('Failed to load config:', result.error);
}
```

## Configuration Files

QADR looks for configuration in the following files (in order):

- `qadr.config.js`
- `qadr.config.ts`
- `qadr.config.mjs`
- `qadr.config.cjs`
- `qadr.config.json`
- `qadr.config.yaml`
- `qadr.config.yml`
- `qadr.config.toml`
- `.qadrrc`
- `.qadrrc.json`
- `.qadrrc.yaml`
- `.qadrrc.yml`

### JSON Example

```json
{
  "version": "1.0",
  "ecosystem": "npm",
  "strategy": "balanced",
  "annealing": {
    "initialTemperature": 1000,
    "coolingRate": 0.95,
    "maxIterations": 100000,
    "replicaCount": 4
  },
  "qubo": {
    "versionWeight": 1.0,
    "dependencyWeight": 10.0,
    "conflictWeight": 100.0
  },
  "security": {
    "enabled": true,
    "failOnVulnerability": true,
    "failSeverities": ["critical", "high"]
  }
}
```

### TypeScript Example

```typescript
// qadr.config.ts
import type { QadrConfig } from '@qadr/config';

const config: Partial<QadrConfig> = {
  ecosystem: 'npm',
  strategy: 'security',

  annealing: {
    replicaCount: 8,
    maxIterations: 200000,
  },

  security: {
    enabled: true,
    failOnVulnerability: true,
  },
};

export default config;
```

### YAML Example

```yaml
version: '1.0'
ecosystem: npm
strategy: balanced

annealing:
  initialTemperature: 1000
  coolingRate: 0.95
  maxIterations: 100000
  replicaCount: 4

qubo:
  versionWeight: 1.0
  dependencyWeight: 10.0
  conflictWeight: 100.0

security:
  enabled: true
  minSeverity: medium

logging:
  level: info
  format: pretty
```

## Configuration Inheritance

Configurations can extend other configurations:

```json
{
  "extends": "./base.config.json",
  "ecosystem": "pip",
  "annealing": {
    "replicaCount": 8
  }
}
```

## Presets

Use presets for common configuration patterns:

```typescript
import { loadConfig, applyPreset, PRESETS } from '@qadr/config';

// Apply preset programmatically
const securityConfig = applyPreset('security');

// Or load with preset
const result = await loadConfig({ preset: 'security' });

// Available presets:
// - 'fast': Prioritizes speed over optimality
// - 'quality': Prioritizes solution quality
// - 'security': Security-focused configuration
// - 'minimal': Fewest dependencies
```

## Environment Variables

QADR respects the following environment variables:

| Variable                     | Config Path                    | Description             |
| ---------------------------- | ------------------------------ | ----------------------- |
| `QADR_ECOSYSTEM`             | `ecosystem`                    | Target ecosystem        |
| `QADR_STRATEGY`              | `strategy`                     | Resolution strategy     |
| `QADR_LOG_LEVEL`             | `logging.level`                | Log level               |
| `QADR_CACHE_ENABLED`         | `cache.enabled`                | Enable caching          |
| `QADR_CACHE_DIR`             | `cache.directory`              | Cache directory         |
| `QADR_TIMEOUT`               | `performance.timeout`          | Timeout in seconds      |
| `QADR_WORKERS`               | `performance.workers`          | Worker threads          |
| `QADR_PRERELEASE`            | `prerelease`                   | Allow prereleases       |
| `QADR_SECURITY_ENABLED`      | `security.enabled`             | Enable security         |
| `QADR_SECURITY_FAIL`         | `security.failOnVulnerability` | Fail on vulnerabilities |
| `QADR_ANNEALING_ITERATIONS`  | `annealing.maxIterations`      | Max iterations          |
| `QADR_ANNEALING_REPLICAS`    | `annealing.replicaCount`       | Replica count           |
| `QADR_REGISTRY_<NAME>_TOKEN` | `registries.<name>.token`      | Registry auth token     |

## Programmatic Usage

### Loading Configuration

```typescript
import { loadConfig, loadConfigSync } from '@qadr/config';

// Async loading (recommended)
const result = await loadConfig({
  cwd: '/path/to/project',
  preset: 'security',
  envVars: true,
  cliOverrides: {
    ecosystem: 'pip',
    logging: { level: 'debug' },
  },
});

// Sync loading (JSON only)
const syncResult = loadConfigSync({
  cwd: '/path/to/project',
});
```

### Validation

```typescript
import {
  validateConfig,
  safeValidateConfig,
  formatValidationErrors,
} from '@qadr/config';

// Throws on invalid config
const validated = validateConfig(myConfig);

// Returns result object
const result = safeValidateConfig(myConfig);
if (!result.success) {
  console.error(formatValidationErrors(result.error));
}
```

### Generating Config Files

```typescript
import { generateConfigFile } from '@qadr/config';

// Generate default config
const json = generateConfigFile('json');
const yaml = generateConfigFile('yaml');
const toml = generateConfigFile('toml');

// Generate with preset
const securityJson = generateConfigFile('json', 'security');
```

## Configuration Reference

### Top-Level Options

| Option        | Type                     | Default      | Description             |
| ------------- | ------------------------ | ------------ | ----------------------- |
| `version`     | `string`                 | `"1.0"`      | Config file version     |
| `ecosystem`   | `Ecosystem`              | `"npm"`      | Target ecosystem        |
| `strategy`    | `ResolutionStrategy`     | `"balanced"` | Resolution strategy     |
| `prerelease`  | `boolean`                | `false`      | Allow pre-releases      |
| `extends`     | `string`                 | -            | Path to extend from     |
| `overrides`   | `Record<string, string>` | `{}`         | Force specific versions |
| `resolutions` | `Record<string, string>` | `{}`         | Package aliases         |
| `ignore`      | `string[]`               | `[]`         | Packages to ignore      |

### Annealing Options

| Option                     | Type                | Default         | Description               |
| -------------------------- | ------------------- | --------------- | ------------------------- |
| `initialTemperature`       | `number`            | `1000`          | Starting temperature      |
| `finalTemperature`         | `number`            | `0.001`         | End temperature           |
| `coolingRate`              | `number`            | `0.95`          | Cooling rate (0-1)        |
| `iterationsPerTemperature` | `number`            | `1000`          | Iterations per temp       |
| `maxIterations`            | `number`            | `100000`        | Max total iterations      |
| `schedule`                 | `AnnealingSchedule` | `"exponential"` | Cooling schedule          |
| `replicaCount`             | `number`            | `4`             | Parallel replicas         |
| `exchangeInterval`         | `number`            | `100`           | Replica exchange interval |
| `seed`                     | `number \| null`    | `null`          | Random seed               |
| `adaptiveTemperature`      | `boolean`           | `true`          | Adaptive temp adjustment  |
| `targetAcceptanceRate`     | `number`            | `0.23`          | Target acceptance rate    |

### QUBO Options

| Option                  | Type      | Default | Description                    |
| ----------------------- | --------- | ------- | ------------------------------ |
| `versionWeight`         | `number`  | `1.0`   | Version preference weight      |
| `dependencyWeight`      | `number`  | `10.0`  | Dependency satisfaction weight |
| `conflictWeight`        | `number`  | `100.0` | Conflict penalty weight        |
| `minimalityWeight`      | `number`  | `0.5`   | Minimize packages weight       |
| `securityWeight`        | `number`  | `5.0`   | Security score weight          |
| `stabilityWeight`       | `number`  | `2.0`   | Stable version weight          |
| `maxVersionsPerPackage` | `number`  | `50`    | Max versions to consider       |
| `constraintPropagation` | `boolean` | `true`  | Enable constraint propagation  |
| `symmetryBreaking`      | `boolean` | `true`  | Enable symmetry breaking       |

### Security Options

| Option                | Type                      | Default                | Description                   |
| --------------------- | ------------------------- | ---------------------- | ----------------------------- |
| `enabled`             | `boolean`                 | `true`                 | Enable security scanning      |
| `minSeverity`         | `VulnerabilitySeverity`   | `"medium"`             | Minimum severity to report    |
| `failOnVulnerability` | `boolean`                 | `false`                | Fail on vulnerabilities       |
| `failSeverities`      | `VulnerabilitySeverity[]` | `["critical", "high"]` | Severities that cause failure |
| `databases`           | `string[]`                | `["osv", "nvd"]`       | Vulnerability databases       |
| `ignoredIds`          | `string[]`                | `[]`                   | Ignored vulnerability IDs     |
| `suggestPatches`      | `boolean`                 | `true`                 | Suggest patches               |

### Performance Options

| Option      | Type      | Default | Description                   |
| ----------- | --------- | ------- | ----------------------------- |
| `workers`   | `number`  | `0`     | Worker threads (0 = auto)     |
| `maxMemory` | `number`  | `0`     | Max memory MB (0 = unlimited) |
| `timeout`   | `number`  | `300`   | Timeout in seconds            |
| `profiling` | `boolean` | `false` | Enable profiling              |
| `lowMemory` | `boolean` | `false` | Low memory mode               |
| `batchSize` | `number`  | `100`   | Processing batch size         |
| `simd`      | `boolean` | `true`  | Enable SIMD optimizations     |

## License

AGPL-3.0-or-later - See [LICENSE](../../LICENSE) for details.
