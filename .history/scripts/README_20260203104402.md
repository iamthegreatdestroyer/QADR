# scripts/

This directory contains utility scripts for development, testing, and
deployment.

## Available Scripts

### setup.ts

Initial setup script for development environment.

```bash
pnpm setup
```

### release.ts

Publish packages using changesets.

```bash
pnpm release
```

### clean.ts

Clean all build artifacts and caches.

```bash
pnpm clean
```

### benchmark.ts

Run performance benchmarks.

```bash
pnpm benchmark
```

## Script Details

Each script is implemented in TypeScript and can be run via `tsx`:

```bash
npx tsx scripts/setup.ts
```

## Adding New Scripts

1. Create a new `.ts` file in this directory
2. Add to `package.json` scripts if needed
3. Follow existing patterns for error handling and logging
