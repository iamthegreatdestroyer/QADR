/**
 * Constraint Encoder - Encodes high-level constraints into QUBO penalty terms.
 *
 * This module provides utilities for encoding various constraint types
 * into the quadratic penalty terms that make up the QUBO Hamiltonian.
 */

import type { IQUBOConstraint, IQUBOMatrix } from './types.js';
import { QUBOConstraintType, quadraticKey } from './types.js';

/**
 * Result of encoding a constraint.
 */
export interface IEncodingResult {
  /** Linear terms to add */
  readonly linearTerms: ReadonlyMap<number, number>;
  /** Quadratic terms to add */
  readonly quadraticTerms: ReadonlyMap<string, number>;
  /** Constant offset (ground state energy contribution) */
  readonly offset: number;
}

/**
 * Encodes constraints into QUBO penalty terms.
 */
export class ConstraintEncoder {
  /**
   * Encode a single constraint into QUBO terms.
   *
   * @param constraint - The constraint to encode
   * @returns Linear and quadratic terms to add to the Hamiltonian
   */
  public encode(constraint: IQUBOConstraint): IEncodingResult {
    switch (constraint.type) {
      case QUBOConstraintType.EXACTLY_ONE:
        return this.encodeExactlyOne(constraint);
      case QUBOConstraintType.AT_MOST_ONE:
        return this.encodeAtMostOne(constraint);
      case QUBOConstraintType.AT_LEAST_ONE:
        return this.encodeAtLeastOne(constraint);
      case QUBOConstraintType.IMPLICATION:
        return this.encodeImplication(constraint);
      case QUBOConstraintType.CONFLICT:
        return this.encodeConflict(constraint);
      case QUBOConstraintType.EQUALITY:
        return this.encodeEquality(constraint);
      default:
        throw new Error(`Unknown constraint type: ${String(constraint.type)}`);
    }
  }

  /**
   * Encode multiple constraints and aggregate results.
   *
   * @param constraints - Constraints to encode
   * @returns Aggregated QUBO matrix updates
   */
  public encodeAll(constraints: readonly IQUBOConstraint[]): IEncodingResult {
    const linear = new Map<number, number>();
    const quadratic = new Map<string, number>();
    let offset = 0;

    for (const constraint of constraints) {
      const result = this.encode(constraint);

      for (const [key, value] of result.linearTerms) {
        linear.set(key, (linear.get(key) ?? 0) + value);
      }

      for (const [key, value] of result.quadraticTerms) {
        quadratic.set(key, (quadratic.get(key) ?? 0) + value);
      }

      offset += result.offset;
    }

    return { linearTerms: linear, quadraticTerms: quadratic, offset };
  }

  /**
   * Encode exactly-one constraint: Σσᵢ = 1
   *
   * Penalty: P(Σσᵢ - 1)² = P(Σσᵢ² - 2Σσᵢ + 2Σᵢ<ⱼσᵢσⱼ + 1)
   *        = P(-Σσᵢ + 2Σᵢ<ⱼσᵢσⱼ + 1)  [since σᵢ² = σᵢ for binary]
   */
  private encodeExactlyOne(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const linear = new Map<number, number>();
    const quadratic = new Map<string, number>();

    // Linear terms: -P for each variable
    for (const v of variables) {
      linear.set(v, -penalty);
    }

    // Quadratic terms: +2P for each pair
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const key = quadraticKey(variables[i]!, variables[j]!);
        quadratic.set(key, 2 * penalty);
      }
    }

    // Constant offset: +P
    return { linearTerms: linear, quadraticTerms: quadratic, offset: penalty };
  }

  /**
   * Encode at-most-one constraint: Σσᵢ ≤ 1
   *
   * Penalty: PΣᵢ<ⱼσᵢσⱼ
   */
  private encodeAtMostOne(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const quadratic = new Map<string, number>();

    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const key = quadraticKey(variables[i]!, variables[j]!);
        quadratic.set(key, penalty);
      }
    }

    return { linearTerms: new Map(), quadraticTerms: quadratic, offset: 0 };
  }

  /**
   * Encode at-least-one constraint: Σσᵢ ≥ 1
   *
   * Penalty: P(1 - Σσᵢ + slack)² with slack variable, or
   * Approximation: P·Πᵢ(1-σᵢ) ≈ P - PΣσᵢ (first-order)
   */
  private encodeAtLeastOne(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const linear = new Map<number, number>();

    // Simple approximation: encourage at least one selection
    const perVarPenalty = penalty / variables.length;
    for (const v of variables) {
      linear.set(v, -perVarPenalty);
    }

    return { linearTerms: linear, quadraticTerms: new Map(), offset: penalty };
  }

  /**
   * Encode implication: σ₀ → (σ₁ ∨ σ₂ ∨ ... ∨ σₙ)
   *
   * If the source is selected, at least one target must be selected.
   * Penalty: Pσ₀(1 - max(σ₁...σₙ))
   * Approximation: -P/n · Σᵢσ₀σᵢ (negative coupling encourages co-selection)
   */
  private encodeImplication(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const quadratic = new Map<string, number>();

    if (variables.length < 2) {
      return { linearTerms: new Map(), quadraticTerms: quadratic, offset: 0 };
    }

    const source = variables[0]!;
    const targets = variables.slice(1);
    const coupling = -penalty / targets.length;

    for (const target of targets) {
      const key = quadraticKey(source, target);
      quadratic.set(key, coupling);
    }

    return { linearTerms: new Map(), quadraticTerms: quadratic, offset: 0 };
  }

  /**
   * Encode conflict: ¬(σᵢ ∧ σⱼ)
   *
   * Penalty: Pσᵢσⱼ
   */
  private encodeConflict(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const quadratic = new Map<string, number>();

    if (variables.length >= 2) {
      const key = quadraticKey(variables[0]!, variables[1]!);
      quadratic.set(key, penalty);
    }

    return { linearTerms: new Map(), quadraticTerms: quadratic, offset: 0 };
  }

  /**
   * Encode equality: σᵢ = σⱼ
   *
   * Penalty: P(σᵢ - σⱼ)² = P(σᵢ + σⱼ - 2σᵢσⱼ)
   */
  private encodeEquality(constraint: IQUBOConstraint): IEncodingResult {
    const { variables, penalty } = constraint;
    const linear = new Map<number, number>();
    const quadratic = new Map<string, number>();

    if (variables.length >= 2) {
      const [v1, v2] = variables;
      linear.set(v1!, penalty);
      linear.set(v2!, penalty);
      quadratic.set(quadraticKey(v1!, v2!), -2 * penalty);
    }

    return { linearTerms: linear, quadraticTerms: quadratic, offset: 0 };
  }

  /**
   * Apply encoding result to a QUBO matrix (mutating).
   */
  public applyToMatrix(
    matrix: { linear: Map<number, number>; quadratic: Map<string, number> },
    encoding: IEncodingResult
  ): void {
    for (const [key, value] of encoding.linearTerms) {
      matrix.linear.set(key, (matrix.linear.get(key) ?? 0) + value);
    }

    for (const [key, value] of encoding.quadraticTerms) {
      matrix.quadratic.set(key, (matrix.quadratic.get(key) ?? 0) + value);
    }
  }
}
