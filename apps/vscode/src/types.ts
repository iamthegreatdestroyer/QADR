/**
 * QADR Extension Types
 *
 * Type definitions for the VS Code extension.
 *
 * @module @qadr/vscode/types
 */

import type * as vscode from 'vscode';

/**
 * Ecosystem type.
 */
export type Ecosystem = 'npm' | 'cargo' | 'pip' | 'go' | 'maven';

/**
 * Vulnerability severity levels.
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Dependency type.
 */
export type DependencyType = 'production' | 'development' | 'optional' | 'peer';

/**
 * Dependency information.
 */
export interface DependencyInfo {
  /** Package name */
  readonly name: string;
  /** Current version constraint */
  readonly version: string;
  /** Resolved version */
  readonly resolvedVersion?: string;
  /** Latest available version */
  readonly latestVersion?: string;
  /** Dependency type */
  readonly type: DependencyType;
  /** Whether an update is available */
  readonly hasUpdate: boolean;
  /** Whether there are vulnerabilities */
  readonly hasVulnerabilities: boolean;
  /** Vulnerabilities in this dependency */
  readonly vulnerabilities: VulnerabilityInfo[];
  /** License identifier */
  readonly license?: string;
  /** Transitive dependencies */
  readonly dependencies: DependencyInfo[];
}

/**
 * Vulnerability information.
 */
export interface VulnerabilityInfo {
  /** Advisory ID */
  readonly id: string;
  /** Severity level */
  readonly severity: Severity;
  /** Vulnerability title */
  readonly title: string;
  /** Description */
  readonly description: string;
  /** CVSS score */
  readonly cvss?: number;
  /** Fixed in version */
  readonly fixedIn?: string;
  /** Reference URL */
  readonly url?: string;
}

/**
 * Analysis result.
 */
export interface AnalysisResult {
  /** Analysis timestamp */
  readonly timestamp: Date;
  /** Ecosystem */
  readonly ecosystem: Ecosystem;
  /** Total dependencies */
  readonly totalDependencies: number;
  /** Dependencies with updates */
  readonly updatesAvailable: number;
  /** Total vulnerabilities */
  readonly vulnerabilityCount: number;
  /** Vulnerabilities by severity */
  readonly vulnerabilitiesBySeverity: Record<Severity, number>;
  /** License issues */
  readonly licenseIssues: number;
  /** Duplicate packages */
  readonly duplicates: number;
  /** All dependencies */
  readonly dependencies: DependencyInfo[];
  /** Errors during analysis */
  readonly errors: string[];
}

/**
 * Analysis status for status bar.
 */
export interface AnalysisStatus {
  /** Whether analysis is running */
  readonly isAnalyzing: boolean;
  /** Last analysis result */
  readonly lastResult?: AnalysisResult;
  /** Error message if analysis failed */
  readonly error?: string;
}

/**
 * Tree item type.
 */
export type TreeItemType =
  | 'ecosystem'
  | 'category'
  | 'dependency'
  | 'vulnerability'
  | 'license'
  | 'update';

/**
 * Dependency tree item.
 */
export interface DependencyTreeItem {
  /** Item type */
  readonly type: TreeItemType;
  /** Label */
  readonly label: string;
  /** Description */
  readonly description?: string;
  /** Tooltip */
  readonly tooltip?: string;
  /** Icon */
  readonly icon?: string;
  /** Collapsible state */
  readonly collapsibleState: vscode.TreeItemCollapsibleState;
  /** Associated data */
  readonly data?: DependencyInfo | VulnerabilityInfo;
  /** Child items */
  readonly children?: DependencyTreeItem[];
  /** Context value for menus */
  readonly contextValue?: string;
}

/**
 * Configuration for QADR extension.
 */
export interface QADRConfig {
  /** Auto-analyze on manifest change */
  readonly autoAnalyze: boolean;
  /** Show inline hints */
  readonly showInlineHints: boolean;
  /** Minimum severity to report */
  readonly securityLevel: Severity;
  /** Show vulnerabilities in diagnostics */
  readonly showVulnerabilities: boolean;
  /** Show license warnings */
  readonly showLicenseWarnings: boolean;
  /** Resolution strategy */
  readonly strategy: 'newest' | 'oldest' | 'minimal' | 'balanced' | 'security';
  /** Enable caching */
  readonly cacheEnabled: boolean;
  /** Cache TTL in seconds */
  readonly cacheTtl: number;
}

/**
 * Webview message types.
 */
export type WebviewMessageType =
  | 'analyze'
  | 'resolve'
  | 'update'
  | 'fix'
  | 'refresh'
  | 'ready'
  | 'error';

/**
 * Webview message.
 */
export interface WebviewMessage {
  /** Message type */
  readonly type: WebviewMessageType;
  /** Payload */
  readonly payload?: unknown;
}

/**
 * Package location in manifest.
 */
export interface PackageLocation {
  /** Package name */
  readonly name: string;
  /** Version range */
  readonly version: string;
  /** Line number (0-based) */
  readonly line: number;
  /** Character offset */
  readonly character: number;
  /** Dependency section */
  readonly section: 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies';
}

/**
 * Quick fix action.
 */
export interface QuickFixAction {
  /** Action title */
  readonly title: string;
  /** Action kind */
  readonly kind: vscode.CodeActionKind;
  /** Edit to apply */
  readonly edit?: vscode.WorkspaceEdit;
  /** Command to run */
  readonly command?: vscode.Command;
  /** Diagnostic */
  readonly diagnostic?: vscode.Diagnostic;
}

/**
 * Hover content for dependencies.
 */
export interface DependencyHover {
  /** Package name */
  readonly name: string;
  /** Current version */
  readonly version: string;
  /** Latest version */
  readonly latestVersion?: string;
  /** Description */
  readonly description?: string;
  /** License */
  readonly license?: string;
  /** Homepage */
  readonly homepage?: string;
  /** Vulnerabilities */
  readonly vulnerabilities: VulnerabilityInfo[];
  /** Dependencies count */
  readonly dependencyCount: number;
}
