/**
 * Command Registration
 *
 * Registers all QADR VS Code extension commands.
 *
 * @module @qadr/vscode/commands
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import { ReportPanel } from '../ui/reportPanel';
import { DependencyTreeProvider } from '../providers/tree';
import { DiagnosticsProvider } from '../providers/diagnostics';

/**
 * Register all extension commands.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  qadrContext: QADRContext,
  treeProvider: DependencyTreeProvider,
  diagnosticsProvider: DiagnosticsProvider
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Resolve Dependencies
  disposables.push(
    vscode.commands.registerCommand('qadr.resolve', async () => {
      await resolveDependencies(qadrContext, treeProvider, diagnosticsProvider);
    })
  );

  // Analyze Dependencies
  disposables.push(
    vscode.commands.registerCommand('qadr.analyze', async () => {
      await analyzeDependencies(qadrContext, treeProvider, diagnosticsProvider);
    })
  );

  // Show Report
  disposables.push(
    vscode.commands.registerCommand('qadr.showReport', () => {
      showReport(context, qadrContext);
    })
  );

  // Update Package
  disposables.push(
    vscode.commands.registerCommand(
      'qadr.updatePackage',
      async (args?: { name: string; version: string }) => {
        await updatePackage(args);
      }
    )
  );

  // Fix Vulnerability
  disposables.push(
    vscode.commands.registerCommand(
      'qadr.fixVulnerability',
      async (args?: { name: string; vuln: { fixedIn: string } }) => {
        await fixVulnerability(args);
      }
    )
  );

  // Open Settings
  disposables.push(
    vscode.commands.registerCommand('qadr.openSettings', () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:qadr.qadr'
      );
    })
  );

  // Show Dependency Tree
  disposables.push(
    vscode.commands.registerCommand('qadr.showDependencyTree', () => {
      vscode.commands.executeCommand('qadrDependencies.focus');
    })
  );

  // Run Benchmark
  disposables.push(
    vscode.commands.registerCommand('qadr.benchmark', async () => {
      await runBenchmark(qadrContext);
    })
  );

  // Refresh Tree
  disposables.push(
    vscode.commands.registerCommand('qadr.refreshTree', () => {
      treeProvider.refresh();
    })
  );

  // Ignore License (internal)
  disposables.push(
    vscode.commands.registerCommand(
      'qadr.ignoreLicense',
      async (packageName: string) => {
        await ignoreLicense(packageName);
      }
    )
  );

  return disposables;
}

/**
 * Resolve dependencies using QADR.
 */
async function resolveDependencies(
  context: QADRContext,
  treeProvider: DependencyTreeProvider,
  diagnosticsProvider: DiagnosticsProvider
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'QADR: Resolving dependencies...',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0 });

        await context.analyzeWorkspace();

        if (token.isCancellationRequested) {
          return;
        }

        progress.report({ increment: 100 });

        const result = context.getAnalysisStatus().lastResult;
        if (result) {
          vscode.window.showInformationMessage(
            `QADR: Resolved ${result.dependencies.length} dependencies`
          );
        }

        // Refresh views
        treeProvider.refresh();
        diagnosticsProvider.refresh();
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`QADR: Resolution failed - ${message}`);
  }
}

/**
 * Analyze dependencies without resolution.
 */
async function analyzeDependencies(
  context: QADRContext,
  treeProvider: DependencyTreeProvider,
  diagnosticsProvider: DiagnosticsProvider
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'QADR: Analyzing dependencies...',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0 });

        await context.analyzeWorkspace();

        if (token.isCancellationRequested) {
          return;
        }

        progress.report({ increment: 100 });

        const results = context.getAllAnalysisResults();
        const totalDeps = results.reduce(
          (sum, r) => sum + r.dependencies.length,
          0
        );
        const totalVulns = results.reduce(
          (sum, r) => sum + r.vulnerabilityCount,
          0
        );

        vscode.window.showInformationMessage(
          `QADR: Analyzed ${totalDeps} dependencies, found ${totalVulns} vulnerabilities`
        );

        // Refresh views
        treeProvider.refresh();
        diagnosticsProvider.refresh();
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`QADR: Analysis failed - ${message}`);
  }
}

/**
 * Show the dependency report panel.
 */
function showReport(
  extensionContext: vscode.ExtensionContext,
  qadrContext: QADRContext
): void {
  const results = qadrContext.getAllAnalysisResults();
  if (results.length === 0) {
    vscode.window.showInformationMessage(
      'QADR: No analysis results. Run QADR: Analyze Dependencies first.'
    );
    return;
  }

  ReportPanel.createOrShow(extensionContext, qadrContext);
}

/**
 * Update a package to a specific version.
 */
async function updatePackage(
  args?: { name: string; version: string }
): Promise<void> {
  if (!args?.name || !args?.version) {
    vscode.window.showErrorMessage('QADR: Missing package name or version');
    return;
  }

  const { name, version } = args;

  // Find package.json files in workspace
  const packageJsons = await vscode.workspace.findFiles(
    '**/package.json',
    '**/node_modules/**'
  );

  if (packageJsons.length === 0) {
    vscode.window.showErrorMessage('QADR: No package.json found');
    return;
  }

  let updated = false;

  for (const uri of packageJsons) {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      const json = JSON.parse(text);

      const sections = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
      ];

      for (const section of sections) {
        if (json[section]?.[name]) {
          // Find the range in the document
          const regex = new RegExp(`"${name}"\\s*:\\s*"[^"]*"`, 'g');
          const match = regex.exec(text);
          
          if (match) {
            const edit = new vscode.WorkspaceEdit();
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            edit.replace(uri, range, `"${name}": "^${version}"`);
            await vscode.workspace.applyEdit(edit);
            
            updated = true;
            vscode.window.showInformationMessage(
              `QADR: Updated ${name} to ^${version}`
            );
          }
        }
      }
    } catch (error) {
      // Continue to next file
    }
  }

  if (!updated) {
    vscode.window.showWarningMessage(
      `QADR: Could not find ${name} in any package.json`
    );
  }
}

/**
 * Fix a vulnerability by updating to a fixed version.
 */
async function fixVulnerability(
  args?: { name: string; vuln: { fixedIn: string } }
): Promise<void> {
  if (!args?.name || !args?.vuln?.fixedIn) {
    vscode.window.showErrorMessage('QADR: Missing vulnerability fix info');
    return;
  }

  await updatePackage({ name: args.name, version: args.vuln.fixedIn });
}

/**
 * Run performance benchmark.
 */
async function runBenchmark(context: QADRContext): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'QADR: Running benchmark...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });

        const iterations = 5;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          progress.report({
            increment: 100 / iterations,
            message: `Run ${i + 1}/${iterations}`,
          });

          const start = performance.now();
          await context.analyzeWorkspace();
          times.push(performance.now() - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        vscode.window.showInformationMessage(
          `QADR Benchmark: avg=${avg.toFixed(0)}ms, min=${min.toFixed(0)}ms, max=${max.toFixed(0)}ms`
        );
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`QADR: Benchmark failed - ${message}`);
  }
}

/**
 * Ignore license warning for a package.
 */
async function ignoreLicense(packageName: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('qadr');
  const ignored: string[] = config.get('ignoredLicenses') || [];

  if (!ignored.includes(packageName)) {
    ignored.push(packageName);
    await config.update(
      'ignoredLicenses',
      ignored,
      vscode.ConfigurationTarget.Workspace
    );
    vscode.window.showInformationMessage(
      `QADR: License warnings ignored for ${packageName}`
    );
  }
}
