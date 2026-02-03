# QADR Examples

This directory contains examples demonstrating QADR usage patterns.

## Structure

```
examples/
├── basic-usage/          # Getting started examples
├── custom-constraints/   # Advanced constraint configuration
├── ecosystem-adapters/   # Working with npm, pip, cargo, maven
├── performance-tuning/   # Optimizing annealing parameters
└── integration/          # CI/CD and tooling integration
```

## Running Examples

Each example can be run independently:

```bash
# Run a specific example
pnpm tsx examples/basic-usage/simple-resolve.ts

# Run all examples
pnpm examples
```

## Prerequisites

Make sure you've built the project first:

```bash
pnpm install
pnpm build
```
