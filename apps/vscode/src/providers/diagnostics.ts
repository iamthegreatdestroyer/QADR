/**
 * Diagnostics Provider
 *
 * Provides diagnostic information for package.json files.
 *
 * @module @qadr/vscode/providers/diagnostics
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import type { DependencyInfo, Severity, VulnerabilityInfo } from '../types';
import { parseManifest, getPackageRange } from '../utils/manifest';

/**
 * Diagnostic provider for QADR.
 */
export class DiagnosticsProvider implements vscode.Disposable {
  private readonly _context: QADRContext;
  private readonly _diagnostics: vscode.DiagnosticCollection;
  private readonly _disposables: vscode.Disposable[] = [];

  /**
   * Create a new diagnostics provider.
   */
  constructor(context: QADRContext) {
    this._context = context;
    this._diagnostics = vscode.languages.createDiagnosticCollection('qadr');
    
    // Watch for document changes
    this._disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (this.isManifest(event.document)) {
          this.updateDiagnostics(event.document);
        }
      })
    );

    // Watch for document opens
    this._disposables.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (this.isManifest(document)) {
          this.updateDiagnostics(document);
        }
      })
    );

    // Initial update for open documents
    for (const document of vscode.workspace.textDocuments) {
      if (this.isManifest(document)) {
        this.updateDiagnostics(document);
      }
    }
  }

  /**
   * Check if a document is a manifest file.
   */
  private isManifest(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith('package.json');
  }

  /**
   * Refresh diagnostics for all open manifests.
   */
  refresh(): void {
    for (const document of vscode.workspace.textDocuments) {
      if (this.isManifest(document)) {
        this.updateDiagnostics(document);
      }
    }
  }

  /**
   * Update diagnostics for a document.
   */
  private updateDiagnostics(document: vscode.TextDocument): void {
    const config = this._context.getConfig();
    const diagnostics: vscode.Diagnostic[] = [];

    // Get analysis result for this document
    const result = this._context.getAnalysisResult(document.uri);
    if (!result) {
      this._diagnostics.set(document.uri, []);
      return;
    }

    // Parse locations
    const locations = parseManifest(document);

    for (const dep of result.dependencies) {
      const location = locations.find((l) => l.name === dep.name);
      if (!location) continue;

      const range = getPackageRange(document, dep.name);
      if (!range) continue;

      // Add vulnerability diagnostics
      if (config.showVulnerabilities && dep.hasVulnerabilities) {
        for (const vuln of dep.vulnerabilities) {
          if (this.meetsThreshold(vuln.severity, config.securityLevel)) {
            diagnostics.push(
              this.createVulnerabilityDiagnostic(range, dep, vuln)
            );
          }
        }
      }

      // Add license warnings
      if (config.showLicenseWarnings && this.hasLicenseIssue(dep)) {
        diagnostics.push(this.createLicenseDiagnostic(range, dep));
      }

      // Add update hints
      if (config.showInlineHints && dep.hasUpdate && dep.latestVersion) {
        diagnostics.push(this.createUpdateDiagnostic(range, dep));
      }
    }

    this._diagnostics.set(document.uri, diagnostics);
  }

  /**
   * Check if severity meets minimum threshold.
   */
  private meetsThreshold(severity: Severity, threshold: Severity): boolean {
    const levels: Severity[] = ['low', 'medium', 'high', 'critical'];
    return levels.indexOf(severity) >= levels.indexOf(threshold);
  }

  /**
   * Check if a dependency has license issues.
   */
  private hasLicenseIssue(dep: DependencyInfo): boolean {
    const problematic = ['UNLICENSED', 'UNKNOWN', undefined];
    return problematic.includes(dep.license);
  }

  /**
   * Create a vulnerability diagnostic.
   */
  private createVulnerabilityDiagnostic(
    range: vscode.Range,
    dep: DependencyInfo,
    vuln: VulnerabilityInfo
  ): vscode.Diagnostic {
    const severity = this.mapSeverity(vuln.severity);
    
    const diagnostic = new vscode.Diagnostic(
      range,
      `${vuln.severity.toUpperCase()}: ${vuln.title}\n${vuln.description}${
        vuln.fixedIn ? `\nFixed in: ${vuln.fixedIn}` : ''
      }`,
      severity
    );

    diagnostic.source = 'QADR';
    diagnostic.code = {
      value: vuln.id,
      target: vuln.url ? vscode.Uri.parse(vuln.url) : undefined,
    } as any;
    
    // Add related info
    diagnostic.relatedInformation = [];
    if (vuln.cvss) {
      diagnostic.relatedInformation.push(
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(vscode.Uri.parse(''), range),
          `CVSS Score: ${vuln.cvss}`
        )
      );
    }

    // Tag for quick fix
    diagnostic.tags = [];

    return diagnostic;
  }

  /**
   * Create a license diagnostic.
   */
  private createLicenseDiagnostic(
    range: vscode.Range,
    dep: DependencyInfo
  ): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      range,
      `License issue: ${dep.license || 'Unknown license'}`,
      vscode.DiagnosticSeverity.Warning
    );

    diagnostic.source = 'QADR';
    diagnostic.code = 'license-issue';

    return diagnostic;
  }

  /**
   * Create an update diagnostic.
   */
  private createUpdateDiagnostic(
    range: vscode.Range,
    dep: DependencyInfo
  ): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      range,
      `Update available: ${dep.version} → ${dep.latestVersion}`,
      vscode.DiagnosticSeverity.Hint
    );

    diagnostic.source = 'QADR';
    diagnostic.code = 'update-available';
    diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];

    return diagnostic;
  }

  /**
   * Map severity to VS Code diagnostic severity.
   */
  private mapSeverity(severity: Severity): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
        return vscode.DiagnosticSeverity.Information;
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this._diagnostics.dispose();
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
  }
}
