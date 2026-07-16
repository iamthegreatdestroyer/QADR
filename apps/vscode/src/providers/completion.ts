/**
 * Completion Provider
 *
 * Provides package name completions for package.json.
 *
 * @module @qadr/vscode/providers/completion
 */

import * as vscode from 'vscode';
import type { QADRContext } from '../context';

/**
 * Completion provider for package names.
 */
export class CompletionProvider implements vscode.CompletionItemProvider {
  private _cache: Map<string, CachedCompletion> = new Map();
  private readonly _cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(_context: QADRContext) {
    // context reserved for future completion-data lookups
  }

  /**
   * Provide completion items.
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    // Only work in package.json files
    if (!document.fileName.endsWith('package.json')) {
      return undefined;
    }

    // Check if we're in a dependency section
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);
    
    // Check if we're typing a package name (inside quotes after colon)
    if (!this.isInDependencyValue(document, position)) {
      return undefined;
    }

    // Get the current text being typed
    const match = textBefore.match(/"([^":]*)$/);
    if (!match) return undefined;

    const query = (match[1] ?? '').toLowerCase();
    if (query.length < 2) return undefined;

    // Search for packages
    const packages = await this.searchPackages(query);
    if (!packages || packages.length === 0) return undefined;

    return packages.map((pkg) => {
      const item = new vscode.CompletionItem(
        pkg.name,
        vscode.CompletionItemKind.Module
      );

      item.detail = pkg.version;
      item.documentation = new vscode.MarkdownString(pkg.description || '');
      
      // Insert the package name and version
      item.insertText = pkg.name;
      
      // Sort by popularity
      item.sortText = String(1000000 - (pkg.downloads || 0)).padStart(10, '0');

      return item;
    });
  }

  /**
   * Resolve additional completion item details.
   */
  async resolveCompletionItem(
    item: vscode.CompletionItem,
    _token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem> {
    // Could fetch more details here if needed
    return item;
  }

  /**
   * Check if cursor is in a dependency value position.
   */
  private isInDependencyValue(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Simple check: are we between "dependencies" and a closing brace?
    const dependencySections = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ];

    for (const section of dependencySections) {
      const sectionMatch = text.indexOf(`"${section}"`);
      if (sectionMatch === -1) continue;

      // Find the opening brace after section
      const braceStart = text.indexOf('{', sectionMatch);
      if (braceStart === -1) continue;

      // Find matching closing brace
      let depth = 1;
      let braceEnd = braceStart + 1;
      while (depth > 0 && braceEnd < text.length) {
        if (text[braceEnd] === '{') depth++;
        if (text[braceEnd] === '}') depth--;
        braceEnd++;
      }

      // Check if cursor is within this section
      if (offset > braceStart && offset < braceEnd) {
        return true;
      }
    }

    return false;
  }

  /**
   * Search for packages matching a query.
   */
  private async searchPackages(query: string): Promise<PackageInfo[]> {
    // Check cache
    const cached = this._cache.get(query);
    if (cached && Date.now() - cached.timestamp < this._cacheTtl) {
      return cached.packages;
    }

    try {
      // Search npm registry
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(
          query
        )}&size=20`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as NpmSearchResponse;
      const packages: PackageInfo[] = data.objects.map((obj) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description ?? '',
        downloads: obj.downloads?.weekly || 0,
      }));

      // Cache results
      this._cache.set(query, {
        packages,
        timestamp: Date.now(),
      });

      return packages;
    } catch {
      return [];
    }
  }
}

/**
 * Package information from npm registry.
 */
interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  downloads?: number;
}

/**
 * Cached completion result.
 */
interface CachedCompletion {
  packages: PackageInfo[];
  timestamp: number;
}

/**
 * npm registry search response.
 */
interface NpmSearchResponse {
  objects: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
    };
    downloads?: {
      weekly?: number;
    };
  }>;
}
