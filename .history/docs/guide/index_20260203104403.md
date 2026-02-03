# What is QADR?

QADR (Quantum-Annealed Dependency Resolution) is a next-generation package
resolution engine that uses quantum-inspired optimization algorithms to solve
complex dependency graphs.

## The Problem

Modern software projects often have hundreds or thousands of dependencies, each
with their own version constraints. Traditional package managers like npm and
yarn use **greedy algorithms** that:

- Make locally optimal choices at each step
- Can miss globally optimal solutions
- Struggle with complex constraint satisfaction
- May produce non-deterministic results

This leads to:

- ❌ Slow resolution times for large projects
- ❌ Suboptimal version selections
- ❌ Difficult-to-debug conflicts
- ❌ Security vulnerabilities from outdated transitive dependencies

## The Solution

QADR uses **simulated annealing** - a metaheuristic inspired by quantum
annealing - to explore the solution space more thoroughly:

```
Traditional (Greedy):
  Step 1 → Step 2 → Step 3 → Local Optimum ❌

QADR (Simulated Annealing):
  Explore → Accept worse → Escape local optimum → Global Optimum ✅
```

### Key Advantages

1. **Global Optimization**: Finds globally optimal version combinations, not
   just locally optimal ones.

2. **Performance**: Parallelized algorithm that scales efficiently with
   dependency count.

3. **Determinism**: Same inputs always produce the same outputs.

4. **Security**: Built-in vulnerability scanning throughout the resolution
   process.

## How It Works

### 1. Graph Construction

QADR first builds a complete dependency graph from your manifest:

```
your-project
├── react@^18.0.0
│   └── react-dom@^18.0.0
├── lodash@^4.17.0
└── typescript@^5.0.0 (dev)
```

### 2. Constraint Encoding

Version constraints are encoded as an energy function that the algorithm
minimizes:

```typescript
E(state) = ∑ conflicts(v) + λ · ∑ age(v) + μ · ∑ vulnerabilities(v)
```

### 3. Simulated Annealing

The algorithm explores the solution space:

```
Temperature: High → Low
Accept worse solutions? Yes → No
Exploration: Broad → Focused
```

### 4. Solution Extraction

The final state represents the optimal version selection:

```
react@18.2.0
react-dom@18.2.0
lodash@4.17.21
typescript@5.3.3
```

## Architecture

QADR is built as a modular monorepo:

```
@qadr/core       - Resolution engine
@qadr/semver     - Version parsing and comparison
@qadr/shared     - Shared types and utilities
@qadr/config     - Configuration loading
@qadr/cli        - Command-line interface
@qadr/vscode     - VS Code extension
@qadr/web        - Web dashboard
@qadr/github-action - GitHub Action
```

## Next Steps

- [Getting Started](/guide/getting-started) - Install and use QADR
- [Why QADR?](/guide/why-qadr) - Detailed comparison with alternatives
- [API Reference](/api/) - Programmatic usage
