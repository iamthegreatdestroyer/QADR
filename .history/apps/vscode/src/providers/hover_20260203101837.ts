/**
 * Hover Provider
 *
 * Provides hover information for dependencies in package.json.
 *
 * @module @qadr/vscode/providers/hover
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import type { DependencyInfo, VulnerabilityInfo } from '../types';
import { findPackageAtPosition } from '../utils/manifest';

/**
 * Hover provider for dependencies.
 */
export class HoverProvider implements vscode.HoverProvider {
  private readonly _context: QADRContext;

  constructor(context: QADRContext) {
    this._context = context;
  }

  /**
   * Provide hover information.
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    // Find the package at cursor position
    const location = findPackageAtPosition(document, position);
    if (!location) return undefined;

    // Get analysis result
    const result = this._context.getAnalysisResult(document.uri);
    if (!result) {
      return this.createBasicHover(location.name, location.version);
    }

    // Find dependency info
    const dep = result.dependencies.find((d) => d.name === location.name);
    if (!dep) {
      return this.createBasicHover(location.name, location.version);
    }

    return this.createDetailedHover(dep);
  }

  /**
   * Create a basic hover without analysis data.
   */
  private createBasicHover(name: string, version: string): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    markdown.appendMarkdown(`## 📦 ${name}\n\n`);
    markdown.appendMarkdown(`**Version:** \`${version}\`\n\n`);
    markdown.appendMarkdown(`*Run QADR: Analyze Dependencies for more info*\n`);

    return new vscode.Hover(markdown);
  }

  /**
   * Create a detailed hover with analysis data.
   */
  private createDetailedHover(dep: DependencyInfo): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Header
    markdown.appendMarkdown(`## 📦 ${dep.name}\n\n`);

    // Version info
    markdown.appendMarkdown(`| Property | Value |\n`);
    markdown.appendMarkdown(`|----------|-------|\n`);
    markdown.appendMarkdown(`| Version | \`${dep.version}\` |\n`);
    
    if (dep.resolvedVersion) {
      markdown.appendMarkdown(`| Resolved | \`${dep.resolvedVersion}\` |\n`);
    }
    
    if (dep.latestVersion) {
      const isOutdated = dep.hasUpdate ? ' ⬆️' : '';
      markdown.appendMarkdown(`| Latest | \`${dep.latestVersion}\`${isOutdated} |\n`);
    }
    
    markdown.appendMarkdown(`| Type | ${dep.type} |\n`);
    
    if (dep.license) {
      markdown.appendMarkdown(`| License | ${dep.license} |\n`);
    }

    markdown.appendMarkdown(`\n`);

    // Vulnerabilities
    if (dep.hasVulnerabilities && dep.vulnerabilities.length > 0) {
      markdown.appendMarkdown(`### ⚠️ Vulnerabilities (${dep.vulnerabilities.length})\n\n`);
      
      for (const vuln of dep.vulnerabilities.slice(0, 3)) {
        const icon = this.getSeverityIcon(vuln.severity);
        markdown.appendMarkdown(`- ${icon} **${vuln.id}**: ${vuln.title}\n`);
        
        if (vuln.fixedIn) {
          markdown.appendMarkdown(`  - Fixed in: \`${vuln.fixedIn}\`\n`);
        }
      }

      if (dep.vulnerabilities.length > 3) {
        markdown.appendMarkdown(`\n*...and ${dep.vulnerabilities.length - 3} more*\n`);
      }

      markdown.appendMarkdown(`\n`);
    }

    // Update available
    if (dep.hasUpdate && dep.latestVersion) {
      markdown.appendMarkdown(`### 📦 Update Available\n\n`);
      markdown.appendMarkdown(`\`${dep.version}\` → \`${dep.latestVersion}\`\n\n`);
      
      // Add command link
      markdown.appendMarkdown(
        `[Update Package](command:qadr.updatePackage?${encodeURIComponent(
          JSON.stringify({ name: dep.name, version: dep.latestVersion })
        )})\n\n`
      );
    }

    // Dependencies count
    if (dep.dependencies.length > 0) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`*${dep.dependencies.length} transitive dependencies*\n`);
    }

    // Links
    markdown.appendMarkdown(`\n---\n\n`);
    markdown.appendMarkdown(
      `[npm](https://npmjs.com/package/${dep.name}) · ` +
      `[bundlephobia](https://bundlephobia.com/package/${dep.name}@${dep.version})`
    );

    return new vscode.Hover(markdown);
  }

  /**
   * Get emoji icon for severity.
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }
}
