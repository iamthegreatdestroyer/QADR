/**
 * @qadr/cli - Spinner Utilities
 *
 * Terminal spinner and progress indicator utilities.
 *
 * @packageDocumentation
 */

import ora, { type Ora } from 'ora';
import type { SpinnerConfig } from '../types.js';

// =============================================================================
// Spinner Manager
// =============================================================================

/**
 * Spinner manager for coordinating multiple spinners
 */
export class SpinnerManager {
  private spinners: Map<string, Ora> = new Map();
  private isCI: boolean;

  constructor(isCI: boolean = false) {
    this.isCI = isCI;
  }

  /**
   * Create and start a new spinner
   */
  start(id: string, config: SpinnerConfig): Ora {
    // Stop any existing spinner with same ID
    this.stop(id);

    const spinner = ora({
      text: config.text,
      spinner: this.isCI ? 'line' : (config.spinner as any ?? 'dots'),
      color: config.color as any ?? 'cyan',
      isSilent: this.isCI,
    });

    spinner.start();
    this.spinners.set(id, spinner);

    return spinner;
  }

  /**
   * Get an existing spinner
   */
  get(id: string): Ora | undefined {
    return this.spinners.get(id);
  }

  /**
   * Update spinner text
   */
  update(id: string, text: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  /**
   * Mark spinner as successful
   */
  succeed(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Mark spinner as failed
   */
  fail(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Mark spinner with warning
   */
  warn(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.warn(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Mark spinner with info
   */
  info(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.info(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Stop a spinner
   */
  stop(id: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  /**
   * Stop all spinners
   */
  stopAll(): void {
    for (const [id, spinner] of this.spinners) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  /**
   * Check if a spinner is active
   */
  isActive(id: string): boolean {
    const spinner = this.spinners.get(id);
    return spinner?.isSpinning ?? false;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a simple spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan',
  });
}

/**
 * Run an async function with a spinner
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: {
    successText?: string;
    failText?: string;
    warnOnError?: boolean;
  } = {},
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await fn();
    spinner.succeed(options.successText ?? text);
    return result;
  } catch (error) {
    if (options.warnOnError) {
      spinner.warn(options.failText ?? `Warning: ${text}`);
    } else {
      spinner.fail(options.failText ?? `Failed: ${text}`);
    }
    throw error;
  }
}

/**
 * Run multiple async operations with progress
 */
export async function withProgress<T>(
  tasks: Array<{
    name: string;
    fn: () => Promise<T>;
  }>,
  options: {
    title?: string;
    concurrency?: number;
  } = {},
): Promise<T[]> {
  const { title = 'Processing', concurrency = 1 } = options;
  const results: T[] = [];
  const total = tasks.length;
  let completed = 0;

  const spinner = createSpinner(`${title} (0/${total})`);
  spinner.start();

  try {
    if (concurrency === 1) {
      // Sequential execution
      for (const task of tasks) {
        spinner.text = `${title}: ${task.name} (${completed}/${total})`;
        const result = await task.fn();
        results.push(result);
        completed++;
      }
    } else {
      // Concurrent execution with limit
      const executing: Promise<void>[] = [];

      for (const task of tasks) {
        const promise = (async () => {
          const result = await task.fn();
          results.push(result);
          completed++;
          spinner.text = `${title} (${completed}/${total})`;
        })();

        executing.push(promise);

        if (executing.length >= concurrency) {
          await Promise.race(executing);
          executing.splice(
            executing.findIndex(p => p === promise),
            1,
          );
        }
      }

      await Promise.all(executing);
    }

    spinner.succeed(`${title} completed (${total}/${total})`);
    return results;
  } catch (error) {
    spinner.fail(`${title} failed at ${completed}/${total}`);
    throw error;
  }
}

// =============================================================================
// Phase Spinner
// =============================================================================

/**
 * Multi-phase operation spinner
 */
export class PhaseSpinner {
  private spinner: Ora;
  private phases: string[];
  private currentPhase: number = 0;
  private startTime: number = 0;

  constructor(phases: string[]) {
    this.phases = phases;
    this.spinner = ora({
      spinner: 'dots',
      color: 'cyan',
    });
  }

  /**
   * Start the spinner
   */
  start(): void {
    this.startTime = Date.now();
    this.currentPhase = 0;
    this.updateText();
    this.spinner.start();
  }

  /**
   * Move to next phase
   */
  nextPhase(): void {
    if (this.currentPhase < this.phases.length - 1) {
      this.currentPhase++;
      this.updateText();
    }
  }

  /**
   * Update the spinner text
   */
  private updateText(): void {
    const phase = this.phases[this.currentPhase];
    const progress = `[${this.currentPhase + 1}/${this.phases.length}]`;
    const elapsed = Date.now() - this.startTime;
    const time = elapsed > 1000 ? ` (${(elapsed / 1000).toFixed(1)}s)` : '';
    this.spinner.text = `${progress} ${phase}${time}`;
  }

  /**
   * Update current phase message
   */
  update(message: string): void {
    this.spinner.text = `[${this.currentPhase + 1}/${this.phases.length}] ${message}`;
  }

  /**
   * Mark as successful
   */
  succeed(message?: string): void {
    const elapsed = Date.now() - this.startTime;
    const time = ` (${(elapsed / 1000).toFixed(2)}s)`;
    this.spinner.succeed((message ?? 'Completed') + time);
  }

  /**
   * Mark as failed
   */
  fail(message?: string): void {
    this.spinner.fail(message ?? `Failed at: ${this.phases[this.currentPhase]}`);
  }

  /**
   * Stop without status
   */
  stop(): void {
    this.spinner.stop();
  }
}
