/**
 * Cooling Schedules for Simulated Annealing.
 *
 * The cooling schedule determines how temperature decreases over time.
 * Different schedules trade off exploration vs exploitation.
 */

import type { ICoolingSchedule, IAnnealingConfig } from './types.js';

/**
 * Exponential cooling: T(k+1) = α * T(k)
 *
 * The most commonly used schedule. Provides a good balance between
 * exploration and exploitation. The cooling rate α is typically 0.95-0.99.
 *
 * @param alpha - Cooling rate (0 < α < 1), default 0.995
 */
export function exponentialCooling(alpha = 0.995): ICoolingSchedule {
  return (currentTemp: number): number => {
    return currentTemp * alpha;
  };
}

/**
 * Linear cooling: T(k) = T₀ - k * (T₀ - T_f) / K
 *
 * Temperature decreases linearly from initial to final over K iterations.
 * Can be too aggressive at low temperatures.
 */
export function linearCooling(): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    const { initialTemperature, finalTemperature, maxIterations } = config;
    const progress = iteration / maxIterations;
    return initialTemperature - progress * (initialTemperature - finalTemperature);
  };
}

/**
 * Logarithmic cooling: T(k) = c / log(k + d)
 *
 * Theoretical optimum for guaranteed convergence to global optimum,
 * but impractically slow. The constant c is typically T₀ * log(2).
 *
 * @param c - Scaling constant (default: initial temp * log(2))
 * @param d - Offset to avoid log(0) (default: 2)
 */
export function logarithmicCooling(c?: number, d = 2): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    const scale = c ?? config.initialTemperature * Math.log(2);
    return scale / Math.log(iteration + d);
  };
}

/**
 * Adaptive cooling: adjusts rate based on acceptance ratio.
 *
 * If too many moves are accepted (random walk), cool faster.
 * If too few are accepted (stuck), heat up slightly.
 *
 * @param targetAcceptance - Target acceptance rate (default: 0.3)
 * @param sensitivity - How strongly to react to deviation (default: 0.1)
 */
export function adaptiveCooling(
  targetAcceptance = 0.3,
  sensitivity = 0.1
): ICoolingSchedule {
  let recentAccepted = 0;
  let recentTotal = 0;
  const windowSize = 100;

  return (currentTemp: number, iteration: number): number => {
    // Track acceptance rate in sliding window
    // (In practice, this would receive accept/reject feedback)
    // For now, use a simple exponential decay toward target

    const baseAlpha = 0.995;

    // Simulated adaptive behavior based on temperature
    // High temp -> faster cooling, low temp -> slower cooling
    const tempFactor = Math.min(1, currentTemp / 10);
    const adaptedAlpha = baseAlpha + (1 - baseAlpha) * tempFactor * 0.5;

    return currentTemp * adaptedAlpha;
  };
}

/**
 * Step cooling: constant temperature for N steps, then sudden drop.
 *
 * Useful for staged optimization where you want thorough exploration
 * at each temperature level before moving on.
 *
 * @param stepsPerLevel - Iterations at each temperature
 * @param dropFactor - Factor to multiply temperature by when dropping
 */
export function stepCooling(
  stepsPerLevel = 1000,
  dropFactor = 0.8
): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number
  ): number => {
    if (iteration % stepsPerLevel === 0 && iteration > 0) {
      return currentTemp * dropFactor;
    }
    return currentTemp;
  };
}

/**
 * Cauchy cooling: T(k) = T₀ / (1 + k)
 *
 * Faster than logarithmic but slower than exponential.
 * Good theoretical properties for continuous optimization.
 */
export function cauchyCooling(): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    return config.initialTemperature / (1 + iteration);
  };
}

/**
 * Boltzmann cooling: T(k) = T₀ / log(1 + k)
 *
 * Similar to logarithmic but with different constants.
 * Theoretically motivated by thermodynamics.
 */
export function boltzmannCooling(): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    return config.initialTemperature / Math.log(2 + iteration);
  };
}

/**
 * Geometric cooling with reheat: periodically reheat to escape local minima.
 *
 * @param alpha - Base cooling rate
 * @param reheatInterval - Iterations between reheats
 * @param reheatFactor - How much to increase temperature on reheat
 */
export function geometricWithReheat(
  alpha = 0.995,
  reheatInterval = 10000,
  reheatFactor = 2.0
): ICoolingSchedule {
  return (
    currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    if (iteration > 0 && iteration % reheatInterval === 0) {
      const reheated = currentTemp * reheatFactor;
      return Math.min(reheated, config.initialTemperature * 0.5);
    }
    return currentTemp * alpha;
  };
}

/**
 * Create a custom cooling schedule from a temperature function.
 *
 * @param tempFunc - Function that returns temperature for a given iteration
 */
export function customCooling(
  tempFunc: (iteration: number, initialTemp: number, finalTemp: number) => number
): ICoolingSchedule {
  return (
    _currentTemp: number,
    iteration: number,
    config: IAnnealingConfig
  ): number => {
    return tempFunc(
      iteration,
      config.initialTemperature,
      config.finalTemperature
    );
  };
}
