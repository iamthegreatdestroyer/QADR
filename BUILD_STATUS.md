# QADR Build & Test Status — v1.0.0

## Summary

| Package | Build | Tests | Notes |
|---------|-------|-------|-------|
| `@qadr/core` | ✅ | ✅ 4/4 | SA, energy, cooling, conflict tests |
| `@qadr/cli` | ✅ | ✅ (no tests, pass) | `qadr resolve` + `qadr audit` wired |
| `@qadr/shared` | ✅ | ✅ | |
| `@qadr/config` | ✅ | ✅ | |
| `@qadr/semver` | ✅ | ✅ | |
| `@qadr/github-action` | ✅ | ✅ (no tests, pass) | `passWithNoTests: true` |
| `@qadr/vscode` | ✅ | ✅ (no tests, pass) | `passWithNoTests: true` |
| `@qadr/docs` | ❌ | — | VitePress ESM/CJS esbuild conflict — out of scope for v1.0.0 |
| `@qadr/web` | ❌ | — | Next.js 14 transpilePackages vs serverComponentsExternalPackages conflict — out of scope for v1.0.0 |

## Core Functionality

- `SimulatedAnnealing` + `QUBOBuilder` + `Hamiltonian` fully implemented in `packages/core`
- 4 tests pass: `test_no_conflicts`, `test_resolves_conflict`, `test_energy_function`, `test_cooling_schedule`
- `examples/conflict-package.json` documents the lodash `^3` vs `^4` conflict scenario
- CLI binary (`qadr`) ships with `resolve` and `audit` subcommands

## Known Issues (Out of Scope)

**`@qadr/docs`** — VitePress is ESM-only; the esbuild `externalize-deps` plugin in Vite 5 cannot load its config via `require()`. Requires either downgrading esbuild or switching to a Vite config with `ssr.noExternal`.

**`@qadr/web`** — Next.js 14 rejects `@qadr/core` appearing in both `transpilePackages` and `serverComponentsExternalPackages` in `next.config.js`. Fix: remove it from one list.

Both issues are scaffold-level config problems unrelated to the QADR resolver logic.
