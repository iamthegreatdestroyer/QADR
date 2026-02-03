# @qadr/cli

> Command-line interface for QADR - Quantum-Annealed Dependency Resolution

## Installation

```bash
# Install globally
npm install -g @qadr/cli

# Or use with npx
npx @qadr/cli resolve

# Or install locally in your project
npm install --save-dev @qadr/cli
```

## Quick Start

```bash
# Resolve dependencies
qadr resolve

# Analyze dependencies for security and licenses
qadr analyze --security --licenses

# Benchmark resolution performance
qadr benchmark

# Initialize configuration
qadr config --init
```

## Commands

### `qadr resolve`

Resolve dependencies using quantum annealing optimization.

```bash
qadr resolve [options]

Options:
  -e, --ecosystem <type>     Target ecosystem (npm, pip, cargo, maven, go)
  -s, --strategy <strategy>  Resolution strategy (newest, oldest, minimal, balanced, security)
  -m, --manifest <path>      Path to package manifest file
  -l, --lockfile <path>      Path to lockfile
  -o, --output <path>        Output file path
  --dry-run                  Skip writing lockfile
  --timeout <seconds>        Maximum resolution time in seconds
  --dev                      Include dev dependencies
  --optional                 Include optional dependencies
  --preset <name>            Use preset configuration (fast, quality, security, minimal)
  -f, --force                Force resolution even if lockfile exists
  --parallel                 Enable parallel processing
  --workers <count>          Number of parallel workers
```

**Examples:**

```bash
# Resolve with security-focused strategy
qadr resolve --strategy security

# Resolve npm project with specific manifest
qadr resolve --ecosystem npm --manifest ./package.json

# Dry run to preview resolution
qadr resolve --dry-run --output resolution.json
```

### `qadr analyze`

Analyze dependencies for security vulnerabilities, license compliance, and
optimization opportunities.

```bash
qadr analyze [options]

Options:
  -e, --ecosystem <type>  Target ecosystem
  -m, --manifest <path>   Path to package manifest file
  -l, --lockfile <path>   Path to lockfile
  --security              Include vulnerability scan
  --licenses              Include license analysis
  --duplicates            Include duplicate detection
  --updates               Include update suggestions
  -o, --output <path>     Output file path
  --depth <number>        Depth of dependency tree to analyze
```

**Examples:**

```bash
# Full analysis
qadr analyze

# Security-only scan
qadr analyze --security

# Export analysis results
qadr analyze --output analysis.json
```

### `qadr benchmark`

Benchmark QADR resolution performance.

```bash
qadr benchmark [options]

Options:
  -i, --iterations <count>  Number of benchmark iterations (default: 10)
  -w, --warmup <count>      Number of warmup iterations (default: 3)
  --compare                 Compare with other resolvers
  --memory                  Include memory profiling
  --cpu                     Include CPU profiling
  --suite <name>            Benchmark suite to run (small, medium, large, all)
  -o, --output <path>       Output file path
  --export <path>           Export benchmark results as JSON
```

**Examples:**

```bash
# Quick benchmark
qadr benchmark --suite small

# Full benchmark with comparison
qadr benchmark --suite all --compare --export results.json

# Profile memory usage
qadr benchmark --memory --iterations 50
```

### `qadr config`

Manage QADR configuration.

```bash
qadr config [key] [value] [options]

Options:
  --list              Show all configuration
  --init              Initialize new configuration file
  --init-format       Configuration format for init (json, yaml, toml, js, ts)
  --validate          Validate configuration
  --path              Show configuration file path
  --reset             Reset to defaults
  --edit              Edit configuration in editor

Arguments:
  key                 Configuration key to get/set
  value               Value to set
```

**Examples:**

```bash
# Initialize config
qadr config --init

# Show all settings
qadr config --list

# Get specific value
qadr config strategy

# Set specific value
qadr config strategy security

# Validate configuration
qadr config --validate
```

### `qadr doctor`

Check QADR installation and environment.

```bash
qadr doctor
```

### `qadr version`

Show detailed version information.

```bash
qadr version
```

## Global Options

All commands support these global options:

```bash
-d, --debug           Enable debug mode
-q, --quiet           Suppress output
--no-color            Disable colored output
-c, --config <path>   Path to configuration file
--cwd <path>          Set working directory
-f, --format <format> Output format (json, yaml, table)
-v, --version         Display version number
-h, --help            Display help
```

## Configuration

QADR can be configured via:

1. Configuration file (qadr.config.json, qadr.config.yaml, etc.)
2. Environment variables
3. Command-line options

### Configuration File

```bash
qadr config --init
```

Creates a `qadr.config.json` with default settings:

```json
{
  "$schema": "https://qadr.dev/schemas/config.json",
  "ecosystem": "npm",
  "strategy": "balanced",
  "annealing": {
    "initialTemperature": 100,
    "coolingRate": 0.95,
    "iterationsPerTemp": 1000,
    "minTemperature": 0.001
  },
  "cache": {
    "enabled": true,
    "ttl": 86400
  },
  "security": {
    "enabled": true,
    "level": "high"
  }
}
```

### Environment Variables

```bash
QADR_ECOSYSTEM=npm
QADR_STRATEGY=security
QADR_CACHE_ENABLED=true
QADR_DEBUG=true
```

## Programmatic Usage

The CLI can also be used programmatically:

```typescript
import { createContext, runResolve } from '@qadr/cli';

// Create execution context
const ctx = await createContext({
  ecosystem: 'npm',
  strategy: 'balanced',
});

// Run resolution
const result = await runResolve(ctx);
```

## Exit Codes

| Code | Description                                        |
| ---- | -------------------------------------------------- |
| 0    | Success                                            |
| 1    | General error                                      |
| 2    | Configuration error                                |
| 3    | Resolution failed                                  |
| 4    | Validation error                                   |
| 5    | Security vulnerability found (with --fail-on-vuln) |

## License

AGPL-3.0-or-later - see [LICENSE](../../LICENSE) for details.

Commercial licensing available - contact licensing@qadr.dev
