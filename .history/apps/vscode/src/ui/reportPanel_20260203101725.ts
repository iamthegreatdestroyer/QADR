/**
 * Report Webview Panel
 *
 * Webview panel for displaying dependency analysis reports.
 *
 * @module @qadr/vscode/ui/reportPanel
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import type { AnalysisResult, WebviewMessage } from '../types';

/**
 * Report panel for displaying analysis results.
 */
export class ReportPanel implements vscode.Disposable {
  public static currentPanel: ReportPanel | undefined;
  private static readonly viewType = 'qadr.report';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _context: QADRContext;
  private readonly _disposables: vscode.Disposable[] = [];

  /**
   * Create or show the report panel.
   */
  static createOrShow(
    extensionContext: vscode.ExtensionContext,
    qadrContext: QADRContext
  ): ReportPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ReportPanel.currentPanel) {
      ReportPanel.currentPanel._panel.reveal(column);
      ReportPanel.currentPanel.update();
      return ReportPanel.currentPanel;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      ReportPanel.viewType,
      'QADR Dependency Report',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionContext.extensionUri, 'resources'),
        ],
      }
    );

    ReportPanel.currentPanel = new ReportPanel(panel, qadrContext);
    return ReportPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, context: QADRContext) {
    this._panel = panel;
    this._context = context;

    // Set initial content
    this.update();

    // Listen for panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleMessage(message),
      null,
      this._disposables
    );

    // Update when panel becomes visible
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this.update();
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * Update the webview content.
   */
  update(): void {
    const results = this._context.getAllAnalysisResults();
    this._panel.webview.html = this.getHtmlContent(results);
  }

  /**
   * Handle messages from the webview.
   */
  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'refresh':
        await this._context.analyzeWorkspace();
        this.update();
        break;

      case 'resolve':
        const manifestUri = this._context.getManifestUris()[0];
        if (manifestUri) {
          await this._context.resolveDependencies(manifestUri);
          this.update();
        }
        break;

      case 'update':
        // Handle package update
        break;

      case 'fix':
        // Handle vulnerability fix
        break;
    }
  }

  /**
   * Generate HTML content for the webview.
   */
  private getHtmlContent(results: AnalysisResult[]): string {
    const result = results[0]; // For now, show first result
    
    const summary = result
      ? `
        <div class="summary">
          <div class="summary-item">
            <span class="summary-value">${result.totalDependencies}</span>
            <span class="summary-label">Dependencies</span>
          </div>
          <div class="summary-item ${result.vulnerabilityCount > 0 ? 'danger' : ''}">
            <span class="summary-value">${result.vulnerabilityCount}</span>
            <span class="summary-label">Vulnerabilities</span>
          </div>
          <div class="summary-item ${result.updatesAvailable > 0 ? 'info' : ''}">
            <span class="summary-value">${result.updatesAvailable}</span>
            <span class="summary-label">Updates</span>
          </div>
          <div class="summary-item ${result.licenseIssues > 0 ? 'warning' : ''}">
            <span class="summary-value">${result.licenseIssues}</span>
            <span class="summary-label">License Issues</span>
          </div>
        </div>
      `
      : '<p>No analysis results yet. Click Analyze to start.</p>';

    const dependencies = result?.dependencies || [];
    const depRows = dependencies
      .slice(0, 50) // Limit for performance
      .map(
        (dep) => `
        <tr>
          <td>${dep.name}</td>
          <td>${dep.version}</td>
          <td>${dep.resolvedVersion || '-'}</td>
          <td>${dep.latestVersion || '-'}</td>
          <td>${dep.type}</td>
          <td>${dep.license || 'Unknown'}</td>
          <td>${
            dep.hasVulnerabilities
              ? '<span class="badge danger">⚠</span>'
              : '<span class="badge success">✓</span>'
          }</td>
        </tr>
      `
      )
      .join('');

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QADR Dependency Report</title>
        <style>
          :root {
            --bg-color: var(--vscode-editor-background);
            --fg-color: var(--vscode-editor-foreground);
            --border-color: var(--vscode-panel-border);
            --primary-color: var(--vscode-button-background);
            --danger-color: #f14c4c;
            --warning-color: #cca700;
            --success-color: #89d185;
            --info-color: #3794ff;
          }
          
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--fg-color);
            background-color: var(--bg-color);
            padding: 20px;
            margin: 0;
          }
          
          h1 {
            font-size: 1.5em;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .actions {
            margin-bottom: 20px;
          }
          
          button {
            background-color: var(--primary-color);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            margin-right: 10px;
            border-radius: 4px;
          }
          
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .summary-item {
            background-color: var(--vscode-input-background);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            min-width: 100px;
          }
          
          .summary-item.danger {
            border-left: 4px solid var(--danger-color);
          }
          
          .summary-item.warning {
            border-left: 4px solid var(--warning-color);
          }
          
          .summary-item.info {
            border-left: 4px solid var(--info-color);
          }
          
          .summary-value {
            display: block;
            font-size: 2em;
            font-weight: bold;
          }
          
          .summary-label {
            display: block;
            opacity: 0.8;
            margin-top: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid var(--border-color);
          }
          
          th {
            background-color: var(--vscode-input-background);
          }
          
          tr:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          
          .badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
          }
          
          .badge.danger {
            background-color: var(--danger-color);
            color: white;
          }
          
          .badge.success {
            background-color: var(--success-color);
            color: black;
          }
          
          .timestamp {
            opacity: 0.7;
            font-size: 0.9em;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>📦 QADR Dependency Report</h1>
        
        <div class="actions">
          <button onclick="refresh()">🔄 Refresh</button>
          <button onclick="resolve()">⚡ Resolve</button>
        </div>
        
        ${summary}
        
        <h2>Dependencies</h2>
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
              <th>Resolved</th>
              <th>Latest</th>
              <th>Type</th>
              <th>License</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${depRows || '<tr><td colspan="7">No dependencies found</td></tr>'}
          </tbody>
        </table>
        
        ${
          result
            ? `<p class="timestamp">Last analyzed: ${result.timestamp.toLocaleString()}</p>`
            : ''
        }
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function refresh() {
            vscode.postMessage({ type: 'refresh' });
          }
          
          function resolve() {
            vscode.postMessage({ type: 'resolve' });
          }
          
          // Notify ready
          vscode.postMessage({ type: 'ready' });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    ReportPanel.currentPanel = undefined;
    this._panel.dispose();

    for (const disposable of this._disposables) {
      disposable.dispose();
    }
  }
}
