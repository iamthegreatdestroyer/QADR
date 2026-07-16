/**
 * Code Action Provider
 *
 * Provides quick fixes for dependency issues.
 *
 * @module @qadr/vscode/providers/codeActions
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import type { DependencyInfo } from '../types';
import { findPackageAtPosition } from '../utils/manifest';

/**
 * Code action provider for dependencies.
 */
export class CodeActionProvider implements vscode.CodeActionProvider {
  private readonly _context: QADRContext;

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  constructor(context: QADRContext) {
    this._context = context;
  }

  /**
   * Provide code actions.
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Find package at cursor
    const location = findPackageAtPosition(document, range.start);
    if (!location) return actions;

    // Get analysis result
    const result = this._context.getAnalysisResult(document.uri);
    const dep = result?.dependencies.find((d) => d.name === location.name);

    // Generate actions based on diagnostics
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'QADR') continue;

      const codeActions = this.createActionsForDiagnostic(
        document,
        diagnostic,
        location.name,
        dep
      );
      actions.push(...codeActions);
    }

    // Add general actions if we have dependency info
    if (dep) {
      actions.push(...this.createGeneralActions(document, dep, location.name));
    }

    return actions;
  }

  /**
   * Create actions for a specific diagnostic.
   */
  private createActionsForDiagnostic(
    _document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    packageName: string,
    dep?: DependencyInfo
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    if (diagnostic.code === 'update-available' && dep?.latestVersion) {
      // Update to latest version
      const updateAction = new vscode.CodeAction(
        `Update ${packageName} to ${dep.latestVersion}`,
        vscode.CodeActionKind.QuickFix
      );
      updateAction.command = {
        title: 'Update Package',
        command: 'qadr.updatePackage',
        arguments: [{ name: packageName, version: dep.latestVersion }],
      };
      updateAction.diagnostics = [diagnostic];
      updateAction.isPreferred = true;
      actions.push(updateAction);
    }

    if (typeof diagnostic.code === 'object' && diagnostic.code?.value) {
      // Vulnerability fix
      const vulnId = String(diagnostic.code.value);
      const vuln = dep?.vulnerabilities.find((v) => v.id === vulnId);

      if (vuln?.fixedIn) {
        const fixAction = new vscode.CodeAction(
          `Fix ${vulnId}: Update to ${vuln.fixedIn}`,
          vscode.CodeActionKind.QuickFix
        );
        fixAction.command = {
          title: 'Fix Vulnerability',
          command: 'qadr.fixVulnerability',
          arguments: [{ name: packageName, vuln }],
        };
        fixAction.diagnostics = [diagnostic];
        fixAction.isPreferred = true;
        actions.push(fixAction);
      }

      // View vulnerability details
      if (vuln?.url) {
        const viewAction = new vscode.CodeAction(
          `View ${vulnId} details`,
          vscode.CodeActionKind.QuickFix
        );
        viewAction.command = {
          title: 'View Details',
          command: 'vscode.open',
          arguments: [vscode.Uri.parse(vuln.url)],
        };
        actions.push(viewAction);
      }
    }

    if (diagnostic.code === 'license-issue') {
      // Ignore license warning
      const ignoreAction = new vscode.CodeAction(
        `Ignore license warning for ${packageName}`,
        vscode.CodeActionKind.QuickFix
      );
      ignoreAction.command = {
        title: 'Ignore License',
        command: 'qadr.ignoreLicense',
        arguments: [packageName],
      };
      actions.push(ignoreAction);
    }

    return actions;
  }

  /**
   * Create general actions for a dependency.
   */
  private createGeneralActions(
    _document: vscode.TextDocument,
    dep: DependencyInfo,
    packageName: string
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // View on npm
    const npmAction = new vscode.CodeAction(
      `View ${packageName} on npm`,
      vscode.CodeActionKind.Refactor
    );
    npmAction.command = {
      title: 'View on npm',
      command: 'vscode.open',
      arguments: [vscode.Uri.parse(`https://npmjs.com/package/${packageName}`)],
    };
    actions.push(npmAction);

    // Check bundle size
    const bundleAction = new vscode.CodeAction(
      `Check bundle size for ${packageName}`,
      vscode.CodeActionKind.Refactor
    );
    bundleAction.command = {
      title: 'Check Bundle Size',
      command: 'vscode.open',
      arguments: [
        vscode.Uri.parse(
          `https://bundlephobia.com/package/${packageName}@${dep.version}`
        ),
      ],
    };
    actions.push(bundleAction);

    // Fix all vulnerabilities for this package
    if (dep.hasVulnerabilities) {
      const fixableVulns = dep.vulnerabilities.filter((v) => v.fixedIn);
      if (fixableVulns.length > 0) {
        const highestFix = fixableVulns.reduce((max, v) =>
          (v.fixedIn || '') > (max.fixedIn || '') ? v : max
        );

        if (highestFix.fixedIn) {
          const fixAllAction = new vscode.CodeAction(
            `Fix all vulnerabilities: Update to ${highestFix.fixedIn}`,
            vscode.CodeActionKind.QuickFix
          );
          fixAllAction.command = {
            title: 'Fix All Vulnerabilities',
            command: 'qadr.updatePackage',
            arguments: [{ name: packageName, version: highestFix.fixedIn }],
          };
          actions.push(fixAllAction);
        }
      }
    }

    return actions;
  }

  /**
   * Resolve a code action.
   */
  resolveCodeAction(
    codeAction: vscode.CodeAction,
    _token: vscode.CancellationToken
  ): vscode.CodeAction {
    // Code actions are already resolved
    return codeAction;
  }
}
