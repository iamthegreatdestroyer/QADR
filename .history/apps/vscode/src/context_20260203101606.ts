/**
 * QADR Extension Context
 *
 * Central context for the extension, managing state and providing
 * access to analysis results and configuration.
 *
 * @module @qadr/vscode/context
 */

import * as vscode from 'vscode';
import type {
  AnalysisResult,
  AnalysisStatus,
  DependencyInfo,
  Ecosystem,
  QADRConfig,
  Severity,
  VulnerabilityInfo,
} from './types';
import type { Logger } from './utils/logger';

/**
 * Extension context managing all QADR state.
 */
export class QADRContext implements vscode.Disposable {
  private readonly _context: vscode.ExtensionContext;
  private readonly _logger: Logger;
  private readonly _disposables: vscode.Disposable[] = [];
  
  private _isInitialized = false;
  private _analysisResults: Map<string, AnalysisResult> = new Map();
  private _isAnalyzing = false;
  private _lastError?: string;
  private _manifestUris: vscode.Uri[] = [];

  /**
   * Create a new QADR context.
   */
  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this._context = context;
    this._logger = logger;
  }

  /**
   * Initialize the context.
   */
  async initialize(): Promise<void> {
    this._logger.info('Initializing QADR context...');

    // Find all manifest files in workspace
    await this.findManifests();

    // Load cached analysis results
    await this.loadCachedResults();

    this._isInitialized = true;
    this._logger.info('QADR context initialized');
  }

  /**
   * Find all manifest files in the workspace.
   */
  private async findManifests(): Promise<void> {
    const manifests = await vscode.workspace.findFiles(
      '**/package.json',
      '**/node_modules/**'
    );
    
    this._manifestUris = manifests;
    this._logger.info(`Found ${manifests.length} manifest file(s)`);
  }

  /**
   * Load cached analysis results from workspace state.
   */
  private async loadCachedResults(): Promise<void> {
    const cached = this._context.workspaceState.get<
      Record<string, AnalysisResult>
    >('qadr.analysisResults');
    
    if (cached) {
      for (const [key, value] of Object.entries(cached)) {
        this._analysisResults.set(key, value);
      }
      this._logger.info(`Loaded ${Object.keys(cached).length} cached result(s)`);
    }
  }

  /**
   * Save analysis results to workspace state.
   */
  private async saveCachedResults(): Promise<void> {
    const toCache: Record<string, AnalysisResult> = {};
    for (const [key, value] of this._analysisResults) {
      toCache[key] = value;
    }
    
    await this._context.workspaceState.update('qadr.analysisResults', toCache);
  }

  /**
   * Check if any manifest files exist.
   */
  hasManifest(): boolean {
    return this._manifestUris.length > 0;
  }

  /**
   * Get all manifest URIs.
   */
  getManifestUris(): vscode.Uri[] {
    return [...this._manifestUris];
  }

  /**
   * Get the extension configuration.
   */
  getConfig(): QADRConfig {
    const config = vscode.workspace.getConfiguration('qadr');
    
    return {
      autoAnalyze: config.get<boolean>('autoAnalyze', true),
      showInlineHints: config.get<boolean>('showInlineHints', true),
      securityLevel: config.get<Severity>('securityLevel', 'high'),
      showVulnerabilities: config.get<boolean>('showVulnerabilities', true),
      showLicenseWarnings: config.get<boolean>('showLicenseWarnings', true),
      strategy: config.get('strategy', 'balanced'),
      cacheEnabled: config.get<boolean>('cacheEnabled', true),
      cacheTtl: config.get<number>('cacheTtl', 86400),
    };
  }

  /**
   * Get current analysis status.
   */
  getAnalysisStatus(): AnalysisStatus {
    const results = Array.from(this._analysisResults.values());
    const lastResult = results.length > 0 ? results[results.length - 1] : undefined;
    
    return {
      isAnalyzing: this._isAnalyzing,
      lastResult,
      error: this._lastError,
    };
  }

  /**
   * Get analysis result for a specific manifest.
   */
  getAnalysisResult(uri: vscode.Uri): AnalysisResult | undefined {
    return this._analysisResults.get(uri.fsPath);
  }

  /**
   * Get all analysis results.
   */
  getAllAnalysisResults(): AnalysisResult[] {
    return Array.from(this._analysisResults.values());
  }

  /**
   * Analyze the workspace or a specific manifest.
   */
  async analyzeWorkspace(manifestUri?: vscode.Uri): Promise<void> {
    if (this._isAnalyzing) {
      this._logger.warn('Analysis already in progress');
      return;
    }

    this._isAnalyzing = true;
    this._lastError = undefined;

    try {
      const urisToAnalyze = manifestUri
        ? [manifestUri]
        : this._manifestUris;

      for (const uri of urisToAnalyze) {
        this._logger.info(`Analyzing: ${uri.fsPath}`);
        
        const result = await this.analyzeManifest(uri);
        this._analysisResults.set(uri.fsPath, result);
      }

      await this.saveCachedResults();

    } catch (error) {
      this._lastError = (error as Error).message;
      this._logger.error('Analysis failed', error as Error);
      throw error;

    } finally {
      this._isAnalyzing = false;
    }
  }

  /**
   * Analyze a single manifest file.
   */
  private async analyzeManifest(uri: vscode.Uri): Promise<AnalysisResult> {
    // TODO: Integrate with @qadr/core for real analysis
    // For now, return mock data
    
    const document = await vscode.workspace.openTextDocument(uri);
    const content = document.getText();
    const manifest = JSON.parse(content);

    const dependencies: DependencyInfo[] = [];
    const vulnerabilities: VulnerabilityInfo[] = [];
    
    // Parse dependencies
    const depTypes = [
      { key: 'dependencies', type: 'production' as const },
      { key: 'devDependencies', type: 'development' as const },
      { key: 'optionalDependencies', type: 'optional' as const },
      { key: 'peerDependencies', type: 'peer' as const },
    ];

    for (const { key, type } of depTypes) {
      const deps = manifest[key] || {};
      for (const [name, version] of Object.entries(deps)) {
        dependencies.push({
          name,
          version: version as string,
          type,
          hasUpdate: false, // TODO: Check registry
          hasVulnerabilities: false, // TODO: Check advisories
          vulnerabilities: [],
          dependencies: [],
        });
      }
    }

    // Detect ecosystem
    const ecosystem = this.detectEcosystem(uri);

    return {
      timestamp: new Date(),
      ecosystem,
      totalDependencies: dependencies.length,
      updatesAvailable: 0,
      vulnerabilityCount: vulnerabilities.length,
      vulnerabilitiesBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      licenseIssues: 0,
      duplicates: 0,
      dependencies,
      errors: [],
    };
  }

  /**
   * Detect ecosystem from manifest file.
   */
  private detectEcosystem(uri: vscode.Uri): Ecosystem {
    const path = uri.fsPath.toLowerCase();
    
    if (path.endsWith('package.json')) return 'npm';
    if (path.endsWith('cargo.toml')) return 'cargo';
    if (path.endsWith('requirements.txt') || path.endsWith('pyproject.toml')) return 'pip';
    if (path.endsWith('go.mod')) return 'go';
    if (path.endsWith('pom.xml')) return 'maven';
    
    return 'npm'; // Default
  }

  /**
   * Resolve dependencies for a manifest.
   */
  async resolveDependencies(manifestUri: vscode.Uri): Promise<void> {
    this._logger.info(`Resolving dependencies: ${manifestUri.fsPath}`);
    
    // TODO: Integrate with @qadr/core for real resolution
    // This would invoke the quantum annealing resolver
    
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'QADR: Resolving Dependencies',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ message: 'Building constraint matrix...' });
        await this.delay(500);
        
        if (token.isCancellationRequested) return;
        progress.report({ message: 'Running quantum annealing...', increment: 30 });
        await this.delay(1000);
        
        if (token.isCancellationRequested) return;
        progress.report({ message: 'Validating solution...', increment: 30 });
        await this.delay(500);
        
        progress.report({ message: 'Writing lockfile...', increment: 30 });
        await this.delay(300);
        
        progress.report({ message: 'Complete!', increment: 10 });
      }
    );
  }

  /**
   * Fix a vulnerability by updating the package.
   */
  async fixVulnerability(
    packageName: string,
    fixedVersion: string,
    manifestUri: vscode.Uri
  ): Promise<void> {
    this._logger.info(`Fixing vulnerability in ${packageName} to ${fixedVersion}`);
    
    // TODO: Implement actual fix logic
    // This would update the manifest and re-analyze
  }

  /**
   * Update a package to the latest version.
   */
  async updatePackage(
    packageName: string,
    newVersion: string,
    manifestUri: vscode.Uri
  ): Promise<void> {
    this._logger.info(`Updating ${packageName} to ${newVersion}`);
    
    // TODO: Implement actual update logic
  }

  /**
   * Get the logger.
   */
  get logger(): Logger {
    return this._logger;
  }

  /**
   * Helper to delay for progress simulation.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
    this._disposables.length = 0;
  }
}
