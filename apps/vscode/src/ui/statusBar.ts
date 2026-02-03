/**
 * Status Bar Component
 *
 * Status bar item showing QADR analysis status.
 *
 * @module @qadr/vscode/ui/statusBar
 */

import * as vscode from 'vscode';
import type { AnalysisStatus, Severity } from '../types';

/**
 * Status bar for QADR extension.
 */
export class StatusBar implements vscode.Disposable {
  private readonly _statusBarItem: vscode.StatusBarItem;
  private readonly _disposables: vscode.Disposable[] = [];

  /**
   * Create a new status bar.
   */
  constructor(context: vscode.ExtensionContext) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this._statusBarItem.command = 'qadr.showReport';
    this._statusBarItem.name = 'QADR Status';
    
    context.subscriptions.push(this._statusBarItem);
  }

  /**
   * Show the status bar item.
   */
  show(): void {
    this._statusBarItem.text = '$(sync~spin) QADR';
    this._statusBarItem.tooltip = 'QADR: Initializing...';
    this._statusBarItem.show();
  }

  /**
   * Hide the status bar item.
   */
  hide(): void {
    this._statusBarItem.hide();
  }

  /**
   * Update the status bar with analysis results.
   */
  update(status: AnalysisStatus): void {
    if (status.isAnalyzing) {
      this._statusBarItem.text = '$(sync~spin) QADR';
      this._statusBarItem.tooltip = 'QADR: Analyzing dependencies...';
      this._statusBarItem.backgroundColor = undefined;
      return;
    }

    if (status.error) {
      this._statusBarItem.text = '$(error) QADR';
      this._statusBarItem.tooltip = `QADR: Error - ${status.error}`;
      this._statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      return;
    }

    if (!status.lastResult) {
      this._statusBarItem.text = '$(package) QADR';
      this._statusBarItem.tooltip = 'QADR: No analysis yet. Click to analyze.';
      this._statusBarItem.backgroundColor = undefined;
      return;
    }

    const result = status.lastResult;
    const vulnCount = result.vulnerabilityCount;
    const updateCount = result.updatesAvailable;

    // Determine status icon and color
    let icon = '$(pass)';
    let backgroundColor: vscode.ThemeColor | undefined;

    if (vulnCount > 0) {
      const maxSeverity = this.getMaxSeverity(result.vulnerabilitiesBySeverity);
      
      if (maxSeverity === 'critical' || maxSeverity === 'high') {
        icon = '$(error)';
        backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      } else {
        icon = '$(warning)';
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }
    } else if (updateCount > 0) {
      icon = '$(arrow-up)';
    }

    // Build text
    const parts: string[] = [];
    if (vulnCount > 0) {
      parts.push(`${vulnCount} vuln`);
    }
    if (updateCount > 0) {
      parts.push(`${updateCount} update`);
    }

    const suffix = parts.length > 0 ? `: ${parts.join(', ')}` : '';
    this._statusBarItem.text = `${icon} QADR${suffix}`;

    // Build tooltip
    const tooltipLines = [
      'QADR Dependency Analysis',
      '',
      `Dependencies: ${result.totalDependencies}`,
      `Vulnerabilities: ${vulnCount}`,
      `Updates available: ${updateCount}`,
      `License issues: ${result.licenseIssues}`,
      `Duplicates: ${result.duplicates}`,
      '',
      `Last analyzed: ${result.timestamp.toLocaleString()}`,
    ];
    
    this._statusBarItem.tooltip = tooltipLines.join('\n');
    this._statusBarItem.backgroundColor = backgroundColor;
  }

  /**
   * Get the highest severity level.
   */
  private getMaxSeverity(
    bySeverity: Record<Severity, number>
  ): Severity | undefined {
    if (bySeverity.critical > 0) return 'critical';
    if (bySeverity.high > 0) return 'high';
    if (bySeverity.medium > 0) return 'medium';
    if (bySeverity.low > 0) return 'low';
    return undefined;
  }

  /**
   * Set to analyzing state.
   */
  setAnalyzing(): void {
    this._statusBarItem.text = '$(sync~spin) QADR';
    this._statusBarItem.tooltip = 'QADR: Analyzing dependencies...';
  }

  /**
   * Set to error state.
   */
  setError(message: string): void {
    this._statusBarItem.text = '$(error) QADR';
    this._statusBarItem.tooltip = `QADR: Error - ${message}`;
    this._statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.errorBackground'
    );
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this._statusBarItem.dispose();
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
  }
}
