/**
 * VS Code Extension Integration Example
 *
 * This example shows how QADR integrates with VS Code
 * to provide real-time dependency analysis.
 */

import { createResolver, DependencyGraph } from '@qadr/core';

// Simulates what the VS Code extension does
async function analyzeWorkspace(projectPath: string) {
  const resolver = createResolver({
    ecosystem: 'npm',
    // Quick mode for real-time analysis
    annealing: {
      type: 'simulated',
      maxIterations: 1000,
      coolingRate: 0.9,
    },
  });

  // Get dependencies from project
  const packageJson = require(`${projectPath}/package.json`);
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  console.log('🔍 Analyzing workspace dependencies...\n');

  // Quick analysis
  const result = await resolver.resolve(dependencies);

  if (!result.success) {
    console.error('Analysis failed:', result.error);
    return;
  }

  // Generate diagnostics like the VS Code extension would
  const diagnostics = generateDiagnostics(result);

  console.log('📊 Workspace Analysis Results:\n');

  console.log(`Total packages: ${Object.keys(result.versions).length}`);
  console.log(`Direct dependencies: ${Object.keys(dependencies).length}`);
  console.log(`Transitive: ${Object.keys(result.versions).length - Object.keys(dependencies).length}`);

  console.log('\n🔔 Diagnostics:');

  if (diagnostics.warnings.length === 0 && diagnostics.hints.length === 0) {
    console.log('  ✅ No issues found!');
  } else {
    for (const warning of diagnostics.warnings) {
      console.log(`  ⚠️ ${warning}`);
    }
    for (const hint of diagnostics.hints) {
      console.log(`  💡 ${hint}`);
    }
  }

  // Code lens suggestions
  console.log('\n📝 CodeLens suggestions:');
  for (const [dep, info] of Object.entries(getCodeLensSuggestions(dependencies, result.versions))) {
    console.log(`  ${dep}: ${info}`);
  }
}

function generateDiagnostics(result: any): { warnings: string[]; hints: string[] } {
  const warnings: string[] = [];
  const hints: string[] = [];

  // Check for old packages
  for (const [name, version] of Object.entries(result.versions)) {
    // Simulated check - real implementation would check against registry
    if (name === 'lodash' && version !== '4.17.21') {
      hints.push(`${name}@${version} can be updated to 4.17.21`);
    }
  }

  // Check for conflicts that were resolved
  if (result.conflicts?.length > 0) {
    for (const conflict of result.conflicts) {
      warnings.push(`Resolved conflict in ${conflict.package}: ${conflict.reason}`);
    }
  }

  return { warnings, hints };
}

function getCodeLensSuggestions(
  declared: Record<string, string>,
  resolved: Record<string, string>
): Record<string, string> {
  const suggestions: Record<string, string> = {};

  for (const [name, range] of Object.entries(declared)) {
    const resolvedVersion = resolved[name];
    if (resolvedVersion) {
      suggestions[name] = `${range} → ${resolvedVersion}`;
    }
  }

  return suggestions;
}

// Run with current directory
analyzeWorkspace(process.cwd()).catch(console.error);
