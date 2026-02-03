/**
 * QADR GitHub Action
 *
 * Entry point for the GitHub Action that provides quantum-annealed
 * dependency resolution in CI/CD pipelines.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from './main';

// Run the action
run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
