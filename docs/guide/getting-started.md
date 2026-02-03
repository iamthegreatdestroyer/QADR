# Getting Started

This guide will help you install QADR and start using it in your projects.

## Prerequisites

- **Node.js 18+** - QADR requires Node.js 18 or later
- **npm, yarn, or pnpm** - Any package manager will work

## Installation

### Global Installation (Recommended)

Install the CLI globally for use in any project:

::: code-group

```bash [npm]
npm install -g @qadr/cli
```

```bash [pnpm]
pnpm add -g @qadr/cli
```

```bash [yarn]
yarn global add @qadr/cli
```

:::

### Local Installation

Or install as a dev dependency in your project:

::: code-group

```bash [npm]
npm install -D @qadr/cli @qadr/core
```

```bash [pnpm]
pnpm add -D @qadr/cli @qadr/core
```

```bash [yarn]
yarn add -D @qadr/cli @qadr/core
```

:::

## Verify Installation

Check that QADR is installed correctly:

```bash
qadr --version
# @qadr/cli v0.1.0
```

## Basic Usage

### Resolve Dependencies

Navigate to a project with a `package.json` and run:

```bash
qadr resolve
```

This will:

1. Parse your `package.json`
2. Fetch package metadata from the registry
3. Run the quantum-annealed resolution algorithm
4. Generate an optimized lockfile

### Analyze Dependencies

Get a detailed analysis of your dependency tree:

```bash
qadr analyze
```

Output includes:

- Total dependency count
- Vulnerability summary
- Outdated packages
- Dependency type breakdown

### Check for Vulnerabilities

Scan for known security vulnerabilities:

```bash
qadr audit
```

### Run Benchmarks

Compare QADR performance against npm:

```bash
qadr benchmark
```

## Configuration

Create a `qadr.config.ts` file for custom configuration:

```typescript
import { defineConfig } from '@qadr/config';

export default defineConfig({
  // Resolution options
  resolver: {
    strategy: 'quantum-annealing',
    temperature: 1.0,
    coolingRate: 0.995,
  },

  // Cache options
  cache: {
    enabled: true,
    directory: '.qadr-cache',
    ttl: '7d',
  },

  // Security options
  security: {
    audit: true,
    failOnVulnerability: 'high',
  },
});
```

## IDE Integration

### VS Code Extension

Install the QADR VS Code extension for real-time analysis:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "QADR"
4. Click Install

Features:

- Inline vulnerability warnings
- Quick fix suggestions
- Dependency tree visualization

### Other Editors

QADR provides Language Server Protocol (LSP) support for other editors. See
[Editor Integration](/guide/editors) for details.

## CI/CD Integration

### GitHub Actions

Add QADR to your GitHub workflow:

```yaml
name: Dependencies

on: [push, pull_request]

jobs:
  qadr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: iamthegreatdestroyer/QADR@v1
        with:
          mode: resolve
          fail-on-vulnerabilities: true
```

### Other CI Systems

Use the CLI in any CI environment:

```bash
npx @qadr/cli resolve --ci
npx @qadr/cli audit --fail-on high
```

## Next Steps

Now that you have QADR installed, explore:

- [Why QADR?](/guide/why-qadr) - Understand the benefits
- [Quantum Annealing](/guide/quantum-annealing) - Learn how the algorithm works
- [Configuration](/config/) - Customize QADR for your needs
- [API Reference](/api/) - Use QADR programmatically
