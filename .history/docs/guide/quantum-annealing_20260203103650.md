# Quantum Annealing

This guide explains the quantum annealing algorithm that powers QADR's dependency resolution.

## What is Quantum Annealing?

Quantum annealing is an optimization technique inspired by quantum mechanics. While true quantum annealing requires quantum hardware, QADR uses **simulated annealing** - a classical algorithm that mimics the same principles.

## The Physical Analogy

Imagine you're searching for the lowest valley in a mountain range:

### Greedy Approach (Traditional)
- Start at a random point
- Always walk downhill
- Stop when you can't go lower
- **Problem**: You might get stuck in a small valley, missing the deepest one

### Simulated Annealing (QADR)
- Start at a random point with high "temperature"
- Usually walk downhill, but sometimes jump uphill
- As temperature decreases, become less likely to jump
- Eventually settle in the deepest valley you've found

## The Algorithm

```typescript
function simulatedAnnealing(initial: State): State {
  let current = initial;
  let best = current;
  let temperature = INITIAL_TEMPERATURE;
  
  while (temperature > MIN_TEMPERATURE) {
    // Generate a neighbor state
    const neighbor = mutate(current);
    
    // Calculate energy (lower is better)
    const delta = energy(neighbor) - energy(current);
    
    // Accept if better, or probabilistically if worse
    if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
      current = neighbor;
      
      if (energy(current) < energy(best)) {
        best = current;
      }
    }
    
    // Cool down
    temperature *= COOLING_RATE;
  }
  
  return best;
}
```

## The Energy Function

In QADR, the "energy" represents how bad a solution is. We minimize:

```
E(state) = Σ conflicts(state) 
         + λ · Σ staleness(state)
         + μ · Σ vulnerabilities(state)
         + ν · Σ size(state)
```

Where:
- **conflicts**: Version constraint violations
- **staleness**: How outdated packages are
- **vulnerabilities**: Known security issues
- **size**: Total download size

The weights (λ, μ, ν) can be configured to prioritize different objectives.

## State Representation

A "state" in QADR is a complete version selection:

```typescript
type State = Map<PackageName, Version>;

// Example state
const state: State = new Map([
  ['react', '18.2.0'],
  ['react-dom', '18.2.0'],
  ['lodash', '4.17.21'],
  ['typescript', '5.3.3'],
]);
```

## Neighbor Generation

The `mutate` function generates a neighbor state by:

1. **Version bump**: Change one package to a different version
2. **Version swap**: Exchange versions between similar packages
3. **Transitive update**: Update a package and its dependents together

```typescript
function mutate(state: State): State {
  const mutation = pickRandom(['bump', 'swap', 'transitive']);
  
  switch (mutation) {
    case 'bump':
      return bumpRandomPackage(state);
    case 'swap':
      return swapVersions(state);
    case 'transitive':
      return updateTransitive(state);
  }
}
```

## Temperature Schedule

The temperature controls how likely we are to accept worse solutions:

- **High temperature**: Accept almost anything (exploration)
- **Low temperature**: Only accept improvements (exploitation)

```
T(t) = T₀ · α^t

Where:
  T₀ = initial temperature (default: 1.0)
  α = cooling rate (default: 0.995)
  t = iteration number
```

## Why It Works for Dependencies

Dependency resolution is an NP-hard problem with:

- Exponentially many possible version combinations
- Multiple interconnected constraints
- No efficient exact algorithm

Simulated annealing is well-suited because:

1. **Large search space**: The probabilistic acceptance helps explore broadly
2. **Many local optima**: Temperature-based escaping finds global solutions
3. **Multi-objective**: Energy function can balance multiple goals
4. **Anytime algorithm**: Returns best solution found so far if interrupted

## Configuration

Tune the algorithm parameters:

```typescript
export default defineConfig({
  resolver: {
    strategy: 'quantum-annealing',
    
    // Initial temperature (higher = more exploration)
    temperature: 1.0,
    
    // Cooling rate (lower = slower cooling, more thorough)
    coolingRate: 0.995,
    
    // Maximum iterations
    maxIterations: 10000,
    
    // Minimum temperature to stop at
    minTemperature: 0.001,
    
    // Random seed for reproducibility
    seed: 12345,
  },
});
```

## Comparison with Other Algorithms

| Algorithm | Optimality | Speed | Memory |
|-----------|------------|-------|--------|
| Greedy (npm) | Local | Fast | Low |
| Backtracking | Exact* | Slow | High |
| SAT Solver | Exact | Variable | High |
| Genetic | Near-optimal | Medium | Medium |
| **Simulated Annealing** | Near-optimal | Fast | Low |

*Backtracking is exact but may timeout on large problems.

## Advanced: Parallel Annealing

QADR can run multiple annealing processes in parallel:

```typescript
export default defineConfig({
  resolver: {
    parallelism: 'auto', // or a specific number
  },
});
```

Each worker explores with a different random seed, and the best solution across all workers is returned.
