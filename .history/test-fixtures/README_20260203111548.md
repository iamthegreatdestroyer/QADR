# QADR Test Fixtures

This directory contains test data for ecosystem integration tests.

## Structure

```
test-fixtures/
├── npm/                    # npm ecosystem fixtures
│   ├── simple/            # Simple dependency tree
│   ├── diamond/           # Diamond dependency conflict
│   ├── deep/              # Deep transitive dependencies
│   └── real-world/        # Real package snapshots
├── pip/                    # Python/pip fixtures
│   ├── simple/
│   ├── conflicts/
│   └── real-world/
├── cargo/                  # Rust/cargo fixtures
│   └── ...
├── maven/                  # Java/Maven fixtures
│   └── ...
└── generated/              # Dynamically generated (gitignored)
```

## Usage

```typescript
import { loadFixture } from '@qadr/test-utils';

const fixture = await loadFixture('npm/simple');
const result = await resolver.resolve(fixture.dependencies);
```

## Generating Fixtures

To regenerate real-world fixtures from live registries:

```bash
pnpm fetch-registry
```

This will fetch and cache package metadata for offline testing.
