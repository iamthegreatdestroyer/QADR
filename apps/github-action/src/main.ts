/**
 * QADR GitHub Action - Main Entry Point
 *
 * Orchestrates dependency resolution, analysis, and reporting
 * in GitHub Actions workflows.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { getInputs, type ActionInputs } from './inputs';
import { Resolver } from './resolver';
import { Analyzer } from './analyzer';
import { Benchmarker } from './benchmarker';
import { Reporter } from './reporter';
import { CacheManager } from './cache';

/**
 * Main action runner
 */
export async function run(): Promise<void> {
  const startTime = Date.now();

  try {
    // Get and validate inputs
    const inputs = getInputs();
    core.debug(`Inputs: ${JSON.stringify(inputs)}`);

    // Initialize cache if enabled
    const cache = inputs.cache ? new CacheManager(inputs) : null;
    const cacheHit = cache ? await cache.restore() : false;
    core.setOutput('cache-hit', cacheHit);

    // Execute based on mode
    let result: ActionResult;

    switch (inputs.mode) {
      case 'resolve':
        result = await runResolve(inputs, cacheHit);
        break;
      case 'analyze':
        result = await runAnalyze(inputs);
        break;
      case 'benchmark':
        result = await runBenchmark(inputs);
        break;
      default:
        throw new Error(`Unknown mode: ${inputs.mode}`);
    }

    // Set outputs
    setOutputs(result, startTime);

    // Generate and post report
    const reporter = new Reporter(inputs);
    await reporter.report(result);

    // Save cache if enabled
    if (cache && !cacheHit) {
      await cache.save();
    }

    // Check failure conditions
    checkFailureConditions(inputs, result);

    core.info(`✅ QADR ${inputs.mode} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`❌ QADR action failed: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

/**
 * Run dependency resolution
 */
async function runResolve(inputs: ActionInputs, cacheHit: boolean): Promise<ActionResult> {
  core.info('🔄 Running QADR dependency resolution...');

  const resolver = new Resolver(inputs);
  const resolution = await resolver.resolve();

  core.info(`📦 Resolved ${resolution.packages.length} packages`);

  if (resolution.conflicts.length > 0) {
    core.warning(`⚠️ Found ${resolution.conflicts.length} dependency conflicts`);
  }

  // Also run analysis for vulnerability and outdated checks
  const analyzer = new Analyzer(inputs);
  const analysis = await analyzer.analyze();

  return {
    mode: 'resolve',
    resolution,
    analysis,
    cacheHit,
  };
}

/**
 * Run dependency analysis only
 */
async function runAnalyze(inputs: ActionInputs): Promise<ActionResult> {
  core.info('🔍 Running QADR dependency analysis...');

  const analyzer = new Analyzer(inputs);
  const analysis = await analyzer.analyze();

  core.info(`📊 Analyzed ${analysis.dependencies.length} dependencies`);

  if (analysis.vulnerabilities.length > 0) {
    core.warning(`⚠️ Found ${analysis.vulnerabilities.length} vulnerabilities`);
  }

  if (analysis.outdated.length > 0) {
    core.info(`📦 Found ${analysis.outdated.length} outdated packages`);
  }

  return {
    mode: 'analyze',
    analysis,
    cacheHit: false,
  };
}

/**
 * Run performance benchmark
 */
async function runBenchmark(inputs: ActionInputs): Promise<ActionResult> {
  core.info('📈 Running QADR benchmark...');

  const benchmarker = new Benchmarker(inputs);
  const benchmark = await benchmarker.run();

  core.info(`⚡ QADR speedup: ${benchmark.speedup.toFixed(2)}x`);
  core.info(`💾 Memory reduction: ${benchmark.memoryReduction.toFixed(1)}%`);

  return {
    mode: 'benchmark',
    benchmark,
    cacheHit: false,
  };
}

/**
 * Set action outputs
 */
function setOutputs(result: ActionResult, startTime: number): void {
  const duration = Date.now() - startTime;
  core.setOutput('resolution-time', duration);

  if (result.resolution) {
    core.setOutput('total-dependencies', result.resolution.packages.length);
    core.setOutput('conflicts', JSON.stringify(result.resolution.conflicts));
    core.setOutput('conflict-count', result.resolution.conflicts.length);
  }

  if (result.analysis) {
    core.setOutput('vulnerabilities', JSON.stringify(result.analysis.vulnerabilities));
    core.setOutput('vulnerability-count', result.analysis.vulnerabilities.length);
    core.setOutput('outdated-count', result.analysis.outdated.length);
  }

  if (result.benchmark) {
    core.setOutput('speedup', result.benchmark.speedup);
  }
}

/**
 * Check if action should fail based on conditions
 */
function checkFailureConditions(inputs: ActionInputs, result: ActionResult): void {
  // Check vulnerability threshold
  if (inputs.failOnVulnerabilities && result.analysis) {
    const thresholds = ['critical', 'high', 'medium', 'low'];
    const thresholdIndex = thresholds.indexOf(inputs.vulnerabilityThreshold);

    const failingVulns = result.analysis.vulnerabilities.filter((v) => {
      const vulnIndex = thresholds.indexOf(v.severity);
      return vulnIndex <= thresholdIndex;
    });

    if (failingVulns.length > 0) {
      core.setFailed(
        `Found ${failingVulns.length} vulnerabilities at or above ${inputs.vulnerabilityThreshold} severity`
      );
    }
  }

  // Check outdated threshold
  if (inputs.failOnOutdated && result.analysis) {
    if (result.analysis.outdated.length > inputs.outdatedThreshold) {
      core.setFailed(
        `Found ${result.analysis.outdated.length} outdated packages (threshold: ${inputs.outdatedThreshold})`
      );
    }
  }
}

/**
 * Action result type
 */
export interface ActionResult {
  mode: 'resolve' | 'analyze' | 'benchmark';
  resolution?: {
    packages: Array<{
      name: string;
      version: string;
      resolved: string;
    }>;
    conflicts: Array<{
      package: string;
      requested: string[];
      resolved?: string;
    }>;
    duration: number;
  };
  analysis?: {
    dependencies: Array<{
      name: string;
      version: string;
      type: string;
    }>;
    vulnerabilities: Array<{
      id: string;
      package: string;
      severity: string;
      title: string;
    }>;
    outdated: Array<{
      name: string;
      current: string;
      latest: string;
    }>;
  };
  benchmark?: {
    qadr: { duration: number; memory: number };
    baseline: { duration: number; memory: number };
    speedup: number;
    memoryReduction: number;
  };
  cacheHit: boolean;
}
