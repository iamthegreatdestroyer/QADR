/**
 * Dependency Tree Provider
 *
 * Tree data provider for the QADR Dependencies view.
 *
 * @module @qadr/vscode/providers/tree
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';
import type {
  DependencyInfo,
  DependencyTreeItem,
} from '../types';

/**
 * Tree item for the dependency view.
 */
export class QADRTreeItem extends vscode.TreeItem {
  constructor(
    public readonly itemData: DependencyTreeItem,
    public readonly children: QADRTreeItem[] = []
  ) {
    super(itemData.label, itemData.collapsibleState);
    
    if (itemData.description !== undefined) {
      this.description = itemData.description;
    }
    this.tooltip = itemData.tooltip;
    if (itemData.contextValue !== undefined) {
      this.contextValue = itemData.contextValue;
    }
    
    // Set icon
    if (itemData.icon) {
      this.iconPath = new vscode.ThemeIcon(itemData.icon);
    }
  }
}

/**
 * Tree data provider for dependencies.
 */
export class DependencyTreeProvider
  implements vscode.TreeDataProvider<QADRTreeItem>
{
  private readonly _context: QADRContext;
  private _onDidChangeTreeData = new vscode.EventEmitter<
    QADRTreeItem | undefined | null | void
  >();
  
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(context: QADRContext) {
    this._context = context;
  }

  /**
   * Refresh the tree.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for display.
   */
  getTreeItem(element: QADRTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a tree item.
   */
  async getChildren(element?: QADRTreeItem): Promise<QADRTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return this.getRootItems();
    }

    return element.children;
  }

  /**
   * Get parent of a tree item.
   */
  getParent(_element: QADRTreeItem): QADRTreeItem | undefined {
    // Not implemented - tree is rebuilt on refresh
    return undefined;
  }

  /**
   * Get root items (categories).
   */
  private async getRootItems(): Promise<QADRTreeItem[]> {
    const results = this._context.getAllAnalysisResults();
    if (results.length === 0) {
      return [
        new QADRTreeItem({
          type: 'category',
          label: 'No dependencies analyzed',
          description: 'Run QADR: Analyze Dependencies',
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          icon: 'info',
        }),
      ];
    }

    const items: QADRTreeItem[] = [];
    const result = results[0]; // For now, use first result
    if (!result) {
      return items;
    }

    // Vulnerabilities category
    if (result.vulnerabilityCount > 0) {
      const vulnChildren = this.buildVulnerabilityItems(result.dependencies);
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Vulnerabilities',
            description: `${result.vulnerabilityCount} found`,
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            icon: 'warning',
            contextValue: 'vulnerabilities',
          },
          vulnChildren
        )
      );
    }

    // Updates available category
    if (result.updatesAvailable > 0) {
      const updateChildren = this.buildUpdateItems(result.dependencies);
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Updates Available',
            description: `${result.updatesAvailable} packages`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: 'arrow-up',
            contextValue: 'updates',
          },
          updateChildren
        )
      );
    }

    // Production dependencies
    const prodDeps = result.dependencies.filter((d) => d.type === 'production');
    if (prodDeps.length > 0) {
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Dependencies',
            description: `${prodDeps.length} packages`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: 'package',
            contextValue: 'dependencies',
          },
          prodDeps.map((d) => this.buildDependencyItem(d))
        )
      );
    }

    // Dev dependencies
    const devDeps = result.dependencies.filter((d) => d.type === 'development');
    if (devDeps.length > 0) {
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Dev Dependencies',
            description: `${devDeps.length} packages`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: 'beaker',
            contextValue: 'devDependencies',
          },
          devDeps.map((d) => this.buildDependencyItem(d))
        )
      );
    }

    // Optional dependencies
    const optDeps = result.dependencies.filter((d) => d.type === 'optional');
    if (optDeps.length > 0) {
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Optional Dependencies',
            description: `${optDeps.length} packages`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: 'question',
            contextValue: 'optionalDependencies',
          },
          optDeps.map((d) => this.buildDependencyItem(d))
        )
      );
    }

    // Peer dependencies
    const peerDeps = result.dependencies.filter((d) => d.type === 'peer');
    if (peerDeps.length > 0) {
      items.push(
        new QADRTreeItem(
          {
            type: 'category',
            label: 'Peer Dependencies',
            description: `${peerDeps.length} packages`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: 'link',
            contextValue: 'peerDependencies',
          },
          peerDeps.map((d) => this.buildDependencyItem(d))
        )
      );
    }

    return items;
  }

  /**
   * Build tree items for vulnerabilities.
   */
  private buildVulnerabilityItems(dependencies: DependencyInfo[]): QADRTreeItem[] {
    const vulnDeps = dependencies.filter((d) => d.hasVulnerabilities);
    
    return vulnDeps.map((dep) => {
      const vulnChildren = dep.vulnerabilities.map((vuln) =>
        new QADRTreeItem({
          type: 'vulnerability',
          label: vuln.id,
          description: vuln.title,
          tooltip: `${vuln.severity.toUpperCase()}: ${vuln.description}`,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          icon: this.getSeverityIcon(vuln.severity),
          data: vuln,
          contextValue: 'vulnerability',
        })
      );

      return new QADRTreeItem(
        {
          type: 'dependency',
          label: dep.name,
          description: `${dep.version} - ${dep.vulnerabilities.length} vulnerabilities`,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          icon: 'warning',
          data: dep,
          contextValue: 'vulnerableDependency',
        },
        vulnChildren
      );
    });
  }

  /**
   * Build tree items for updates.
   */
  private buildUpdateItems(dependencies: DependencyInfo[]): QADRTreeItem[] {
    return dependencies
      .filter((d) => d.hasUpdate)
      .map(
        (dep) =>
          new QADRTreeItem({
            type: 'update',
            label: dep.name,
            description: `${dep.version} → ${dep.latestVersion}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            icon: 'arrow-up',
            data: dep,
            contextValue: 'updateAvailable',
          })
      );
  }

  /**
   * Build a tree item for a dependency.
   */
  private buildDependencyItem(dep: DependencyInfo): QADRTreeItem {
    const hasChildren = dep.dependencies.length > 0;
    
    let icon = 'package';
    if (dep.hasVulnerabilities) {
      icon = 'warning';
    } else if (dep.hasUpdate) {
      icon = 'arrow-up';
    }

    const children = hasChildren
      ? dep.dependencies.map((d) => this.buildDependencyItem(d))
      : [];

    return new QADRTreeItem(
      {
        type: 'dependency',
        label: dep.name,
        description: dep.version,
        tooltip: this.buildDependencyTooltip(dep),
        collapsibleState: hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        icon,
        data: dep,
        contextValue: 'dependency',
      },
      children
    );
  }

  /**
   * Build tooltip for a dependency.
   */
  private buildDependencyTooltip(dep: DependencyInfo): string {
    const lines = [
      `**${dep.name}** ${dep.version}`,
      '',
      `Type: ${dep.type}`,
    ];

    if (dep.license) {
      lines.push(`License: ${dep.license}`);
    }

    if (dep.hasVulnerabilities) {
      lines.push(`⚠️ ${dep.vulnerabilities.length} vulnerabilities`);
    }

    if (dep.hasUpdate && dep.latestVersion) {
      lines.push(`📦 Update available: ${dep.latestVersion}`);
    }

    return lines.join('\n');
  }

  /**
   * Get icon for severity level.
   */
  private getSeverityIcon(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'circle-outline';
    }
  }
}
