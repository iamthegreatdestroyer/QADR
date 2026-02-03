/**
 * Hamiltonian - Energy function for QUBO optimization.
 *
 * The Hamiltonian defines the energy landscape that the annealing
 * algorithm traverses. Lower energy = better solution.
 *
 *   H(σ) = Σᵢⱼ Jᵢⱼσᵢσⱼ + Σᵢ hᵢσᵢ
 *
 * Where:
 *   - σᵢ ∈ {0, 1} are binary variables
 *   - Jᵢⱼ are quadratic coupling coefficients
 *   - hᵢ are linear bias coefficients
 */

import type { IQUBOMatrix } from './types.js';
import { parseQuadraticKey } from './types.js';

/**
 * Represents the energy function for a QUBO problem.
 */
export class Hamiltonian {
  private readonly linear: ReadonlyMap<number, number>;
  private readonly quadratic: ReadonlyMap<string, number>;
  private readonly size: number;

  constructor(matrix: IQUBOMatrix) {
    this.linear = matrix.linear;
    this.quadratic = matrix.quadratic;
    this.size = matrix.size;
  }

  /**
   * Calculate the total energy of a solution.
   *
   * @param assignment - Binary assignment (variable → 0 or 1)
   * @returns Total energy
   */
  public energy(assignment: ReadonlyMap<number, 0 | 1>): number {
    let energy = 0;

    // Linear terms: Σᵢ hᵢσᵢ
    for (const [i, h] of this.linear) {
      const sigma = assignment.get(i) ?? 0;
      energy += h * sigma;
    }

    // Quadratic terms: Σᵢⱼ Jᵢⱼσᵢσⱼ
    for (const [key, J] of this.quadratic) {
      const [i, j] = parseQuadraticKey(key);
      const sigmaI = assignment.get(i) ?? 0;
      const sigmaJ = assignment.get(j) ?? 0;
      energy += J * sigmaI * sigmaJ;
    }

    return energy;
  }

  /**
   * Calculate the energy change from flipping a single variable.
   *
   * This is the key optimization for simulated annealing - we can compute
   * the energy delta in O(degree) instead of O(n²) for the full energy.
   *
   * ΔE = h_i * Δσᵢ + Σⱼ Jᵢⱼ * σⱼ * Δσᵢ
   *    = (2σᵢ - 1) * (hᵢ + Σⱼ Jᵢⱼσⱼ)  [for flip: Δσᵢ = 1 - 2σᵢ]
   *
   * @param assignment - Current binary assignment
   * @param variable - Variable to flip
   * @returns Energy change if this variable is flipped
   */
  public energyDelta(assignment: ReadonlyMap<number, 0 | 1>, variable: number): number {
    const currentValue = assignment.get(variable) ?? 0;
    const flipSign = currentValue === 0 ? 1 : -1;

    // Linear contribution
    let delta = (this.linear.get(variable) ?? 0) * flipSign;

    // Quadratic contributions
    for (const [key, J] of this.quadratic) {
      const [i, j] = parseQuadraticKey(key);

      if (i === variable) {
        const sigmaJ = assignment.get(j) ?? 0;
        delta += J * sigmaJ * flipSign;
      } else if (j === variable) {
        const sigmaI = assignment.get(i) ?? 0;
        delta += J * sigmaI * flipSign;
      }
    }

    return delta;
  }

  /**
   * Calculate energy deltas for all variables at once.
   * Useful for choosing the best flip in greedy descent.
   *
   * @param assignment - Current binary assignment
   * @returns Map of variable → energy delta if flipped
   */
  public allEnergyDeltas(assignment: ReadonlyMap<number, 0 | 1>): Map<number, number> {
    const deltas = new Map<number, number>();

    for (let i = 0; i < this.size; i++) {
      deltas.set(i, this.energyDelta(assignment, i));
    }

    return deltas;
  }

  /**
   * Get the number of variables.
   */
  public get variableCount(): number {
    return this.size;
  }

  /**
   * Get the degree of a variable (number of quadratic connections).
   */
  public degree(variable: number): number {
    let count = 0;

    for (const key of this.quadratic.keys()) {
      const [i, j] = parseQuadraticKey(key);
      if (i === variable || j === variable) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get neighbors of a variable (connected via quadratic terms).
   */
  public neighbors(variable: number): number[] {
    const neighbors: number[] = [];

    for (const key of this.quadratic.keys()) {
      const [i, j] = parseQuadraticKey(key);
      if (i === variable) {
        neighbors.push(j);
      } else if (j === variable) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Check if a solution is valid (binary values only).
   */
  public isValidSolution(assignment: ReadonlyMap<number, 0 | 1>): boolean {
    for (let i = 0; i < this.size; i++) {
      const value = assignment.get(i);
      if (value !== 0 && value !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a random initial solution.
   */
  public randomSolution(rng: () => number = Math.random): Map<number, 0 | 1> {
    const assignment = new Map<number, 0 | 1>();

    for (let i = 0; i < this.size; i++) {
      assignment.set(i, rng() < 0.5 ? 0 : 1);
    }

    return assignment;
  }

  /**
   * Create a solution with all variables set to 0.
   */
  public zeroSolution(): Map<number, 0 | 1> {
    const assignment = new Map<number, 0 | 1>();

    for (let i = 0; i < this.size; i++) {
      assignment.set(i, 0);
    }

    return assignment;
  }

  /**
   * Clone a solution.
   */
  public cloneSolution(assignment: ReadonlyMap<number, 0 | 1>): Map<number, 0 | 1> {
    return new Map(assignment);
  }

  /**
   * Flip a variable in a solution (mutating).
   */
  public flipVariable(assignment: Map<number, 0 | 1>, variable: number): void {
    const current = assignment.get(variable) ?? 0;
    assignment.set(variable, current === 0 ? 1 : 0);
  }
}
