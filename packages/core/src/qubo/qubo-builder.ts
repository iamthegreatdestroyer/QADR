/**
 * QUBO Builder - Transforms dependency graphs into QUBO problems.
 *
 * This is the core transformation that enables quantum-inspired optimization
 * for dependency resolution. The builder creates a Hamiltonian where:
 *
 * - Each binary variable σᵢ represents "select version i"
 * - Constraints are encoded as penalty terms
 * - Preferences are encoded as bias terms
 *
 * The goal is to find the binary assignment that minimizes:
 *   H(σ) = Σᵢⱼ Jᵢⱼσᵢσⱼ + Σᵢ hᵢσᵢ
 */

import type { IDependencyNode, IDependencySpec } from '../types.js';
import type {
  IQUBOConfig,
  IQUBOConstraint,
  IQUBOMatrix,
  IQUBOProblem,
  IQUBOStats,
  IQUBOVariable,
} from './types.js';
import { DEFAULT_QUBO_CONFIG, quadraticKey, QUBOConstraintType } from './types.js';

/**
 * Input for building a QUBO problem.
 */
export interface IQUBOBuilderInput {
  /** Root dependencies to resolve */
  readonly rootDependencies: readonly IDependencySpec[];
  /** All packages and their available versions */
  readonly packageVersions: ReadonlyMap<string, IDependencyNode>;
  /** Known conflicts between versions */
  readonly conflicts?: ReadonlyMap<string, readonly string[]>;
  /** Version popularity scores (downloads, stars, etc.) */
  readonly popularity?: ReadonlyMap<string, number>;
}

/**
 * Builds QUBO problems from dependency graphs.
 */
export class QUBOBuilder {
  private readonly config: IQUBOConfig;

  constructor(config: Partial<IQUBOConfig> = {}) {
    this.config = { ...DEFAULT_QUBO_CONFIG, ...config };
  }

  /**
   * Build a QUBO problem from a dependency graph.
   *
   * @param input - The dependency graph and metadata
   * @returns A complete QUBO problem ready for optimization
   */
  public build(input: IQUBOBuilderInput): IQUBOProblem {
    // Phase 1: Create variables
    const { variables, variableIndex } = this.createVariables(input);

    // Phase 2: Build constraint list
    const constraints = this.buildConstraints(input, variables, variableIndex);

    // Phase 3: Construct the QUBO matrix
    const matrix = this.buildMatrix(variables, constraints, input);

    // Phase 4: Compute statistics
    const stats = this.computeStats(variables, matrix, constraints, input);

    return {
      variables,
      matrix,
      constraints,
      variableIndex,
      stats,
    };
  }

  /**
   * Create binary variables for each (package, version) pair.
   */
  private createVariables(input: IQUBOBuilderInput): {
    variables: IQUBOVariable[];
    variableIndex: Map<string, number>;
  } {
    const variables: IQUBOVariable[] = [];
    const variableIndex = new Map<string, number>();
    let id = 0;

    for (const [packageName, node] of input.packageVersions) {
      for (const version of node.versions) {
        const key = `${packageName}@${version}`;

        // Calculate bias based on version recency and popularity
        const recencyIndex = node.versions.indexOf(version);
        const recencyBias = -this.config.recencyBonus * (node.versions.length - 1 - recencyIndex);

        const popularityScore = input.popularity?.get(key) ?? 0;
        const popularityBias = -this.config.popularityBonus * Math.log1p(popularityScore);

        const bias = recencyBias + popularityBias;

        variables.push({
          id,
          packageName,
          version,
          bias,
          label: key,
        });

        variableIndex.set(key, id);
        id++;
      }
    }

    return { variables, variableIndex };
  }

  /**
   * Build all constraints for the problem.
   */
  private buildConstraints(
    input: IQUBOBuilderInput,
    variables: readonly IQUBOVariable[],
    variableIndex: ReadonlyMap<string, number>
  ): IQUBOConstraint[] {
    const constraints: IQUBOConstraint[] = [];

    // 1. One-hot constraints: exactly one version per package
    constraints.push(...this.buildOneHotConstraints(input, variables));

    // 2. Dependency constraints: if A selected, its deps must be satisfied
    constraints.push(...this.buildDependencyConstraints(input, variableIndex));

    // 3. Conflict constraints: incompatible versions cannot coexist
    constraints.push(...this.buildConflictConstraints(input, variableIndex));

    return constraints;
  }

  /**
   * Build one-hot constraints (exactly one version per package).
   */
  private buildOneHotConstraints(
    input: IQUBOBuilderInput,
    variables: readonly IQUBOVariable[]
  ): IQUBOConstraint[] {
    const constraints: IQUBOConstraint[] = [];

    // Group variables by package
    const packageVariables = new Map<string, number[]>();
    for (const variable of variables) {
      const existing = packageVariables.get(variable.packageName) ?? [];
      existing.push(variable.id);
      packageVariables.set(variable.packageName, existing);
    }

    // Create one-hot constraint for each package
    for (const [packageName, varIds] of packageVariables) {
      if (varIds.length > 1) {
        constraints.push({
          type: QUBOConstraintType.EXACTLY_ONE,
          variables: varIds,
          penalty: this.config.oneHotPenalty,
          description: `Exactly one version of ${packageName}`,
        });
      }
    }

    return constraints;
  }

  /**
   * Build dependency constraints (implications).
   */
  private buildDependencyConstraints(
    input: IQUBOBuilderInput,
    variableIndex: ReadonlyMap<string, number>
  ): IQUBOConstraint[] {
    const constraints: IQUBOConstraint[] = [];

    for (const [packageName, node] of input.packageVersions) {
      for (const version of node.versions) {
        const deps = node.dependenciesByVersion.get(version) ?? [];
        const sourceVarId = variableIndex.get(`${packageName}@${version}`);

        if (sourceVarId === undefined) {
          continue;
        }

        for (const dep of deps) {
          // Find all versions of the dependency that satisfy the constraint
          const depNode = input.packageVersions.get(dep.name);
          if (!depNode) {
            continue;
          }

          // Get all satisfying versions (simplified - real impl uses semver)
          const satisfyingVarIds: number[] = [];
          for (const depVersion of depNode.versions) {
            const depVarId = variableIndex.get(`${dep.name}@${depVersion}`);
            if (depVarId !== undefined) {
              // TODO: Check if depVersion satisfies dep.constraint
              satisfyingVarIds.push(depVarId);
            }
          }

          if (satisfyingVarIds.length > 0) {
            constraints.push({
              type: QUBOConstraintType.IMPLICATION,
              variables: [sourceVarId, ...satisfyingVarIds],
              penalty: this.config.dependencyPenalty,
              description: `${packageName}@${version} requires ${dep.name}@${dep.constraint}`,
            });
          }
        }
      }
    }

    return constraints;
  }

  /**
   * Build conflict constraints.
   */
  private buildConflictConstraints(
    input: IQUBOBuilderInput,
    variableIndex: ReadonlyMap<string, number>
  ): IQUBOConstraint[] {
    const constraints: IQUBOConstraint[] = [];

    if (!input.conflicts) {
      return constraints;
    }

    for (const [key, conflictingKeys] of input.conflicts) {
      const varIdA = variableIndex.get(key);
      if (varIdA === undefined) {
        continue;
      }

      for (const conflictKey of conflictingKeys) {
        const varIdB = variableIndex.get(conflictKey);
        if (varIdB === undefined) {
          continue;
        }

        constraints.push({
          type: QUBOConstraintType.CONFLICT,
          variables: [varIdA, varIdB],
          penalty: this.config.conflictPenalty,
          description: `${key} conflicts with ${conflictKey}`,
        });
      }
    }

    return constraints;
  }

  /**
   * Build the QUBO matrix from variables and constraints.
   */
  private buildMatrix(
    variables: readonly IQUBOVariable[],
    constraints: readonly IQUBOConstraint[],
    input: IQUBOBuilderInput
  ): IQUBOMatrix {
    const linear = new Map<number, number>();
    const quadratic = new Map<string, number>();
    const size = variables.length;

    // Initialize linear terms from variable biases
    for (const variable of variables) {
      linear.set(variable.id, variable.bias);
    }

    // Add constraint penalties to the matrix
    for (const constraint of constraints) {
      this.addConstraintToMatrix(constraint, linear, quadratic);
    }

    return { size, linear, quadratic };
  }

  /**
   * Add a constraint's penalty terms to the matrix.
   */
  private addConstraintToMatrix(
    constraint: IQUBOConstraint,
    linear: Map<number, number>,
    quadratic: Map<string, number>
  ): void {
    const { type, variables: vars, penalty } = constraint;

    switch (type) {
      case QUBOConstraintType.EXACTLY_ONE:
        // Penalty: P * (Σσᵢ - 1)² = P * (Σσᵢ² + 2Σᵢ<ⱼσᵢσⱼ - 2Σσᵢ + 1)
        // Since σᵢ² = σᵢ for binary: P * (-Σσᵢ + 2Σᵢ<ⱼσᵢσⱼ + 1)
        // Linear: -P for each variable
        // Quadratic: 2P for each pair
        for (const v of vars) {
          linear.set(v, (linear.get(v) ?? 0) - penalty);
        }
        for (let i = 0; i < vars.length; i++) {
          for (let j = i + 1; j < vars.length; j++) {
            const key = quadraticKey(vars[i]!, vars[j]!);
            quadratic.set(key, (quadratic.get(key) ?? 0) + 2 * penalty);
          }
        }
        break;

      case QUBOConstraintType.CONFLICT:
        // Penalty: P * σᵢσⱼ (penalize both being 1)
        if (vars.length >= 2) {
          const key = quadraticKey(vars[0]!, vars[1]!);
          quadratic.set(key, (quadratic.get(key) ?? 0) + penalty);
        }
        break;

      case QUBOConstraintType.IMPLICATION:
        // If σ₀ = 1, at least one of σ₁...σₙ must be 1
        // Penalty: P * σ₀ * (1 - Σᵢ₌₁ⁿ σᵢ)² when Σσᵢ = 0
        // Simplified: add small quadratic coupling
        if (vars.length >= 2) {
          const source = vars[0]!;
          for (let i = 1; i < vars.length; i++) {
            const key = quadraticKey(source, vars[i]!);
            // Negative coupling encourages selecting both
            quadratic.set(key, (quadratic.get(key) ?? 0) - penalty / vars.length);
          }
        }
        break;

      case QUBOConstraintType.AT_MOST_ONE:
        // Penalty: P * Σᵢ<ⱼσᵢσⱼ
        for (let i = 0; i < vars.length; i++) {
          for (let j = i + 1; j < vars.length; j++) {
            const key = quadraticKey(vars[i]!, vars[j]!);
            quadratic.set(key, (quadratic.get(key) ?? 0) + penalty);
          }
        }
        break;

      case QUBOConstraintType.AT_LEAST_ONE:
        // Penalty: P * Πᵢ(1 - σᵢ) - approximated via linear penalty
        for (const v of vars) {
          linear.set(v, (linear.get(v) ?? 0) - penalty / vars.length);
        }
        break;

      case QUBOConstraintType.EQUALITY:
        // Penalty: P * (σᵢ - σⱼ)² = P * (σᵢ + σⱼ - 2σᵢσⱼ)
        if (vars.length >= 2) {
          linear.set(vars[0]!, (linear.get(vars[0]!) ?? 0) + penalty);
          linear.set(vars[1]!, (linear.get(vars[1]!) ?? 0) + penalty);
          const key = quadraticKey(vars[0]!, vars[1]!);
          quadratic.set(key, (quadratic.get(key) ?? 0) - 2 * penalty);
        }
        break;
    }
  }

  /**
   * Compute statistics about the QUBO problem.
   */
  private computeStats(
    variables: readonly IQUBOVariable[],
    matrix: IQUBOMatrix,
    constraints: readonly IQUBOConstraint[],
    input: IQUBOBuilderInput
  ): IQUBOStats {
    const variableCount = variables.length;
    const linearTerms = matrix.linear.size;
    const quadraticTerms = matrix.quadratic.size;
    const constraintCount = constraints.length;
    const packageCount = input.packageVersions.size;

    // Density: actual non-zeros / possible non-zeros
    const maxQuadratic = (variableCount * (variableCount - 1)) / 2;
    const density = maxQuadratic > 0 ? quadraticTerms / maxQuadratic : 0;

    const avgVersionsPerPackage = packageCount > 0 ? variableCount / packageCount : 0;

    return {
      variableCount,
      linearTerms,
      quadraticTerms,
      constraintCount,
      density,
      packageCount,
      avgVersionsPerPackage,
    };
  }
}
