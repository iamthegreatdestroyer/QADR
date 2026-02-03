/**
 * @qadr/vscode - QADR VS Code Extension
 *
 * Main extension entry point. Handles activation, command registration,
 * and lifecycle management for the QADR dependency resolution extension.
 *
 * @module @qadr/vscode
 */

import * as vscode from 'vscode';
import { DependencyTreeProvider } from './providers/tree';
import { DiagnosticsProvider } from './providers/diagnostics';
import { HoverProvider } from './providers/hover';
import { CodeActionProvider } from './providers/codeActions';
import { CompletionProvider } from './providers/completion';
import { registerCommands } from './commands';
import { QADRContext } from './context';
import { StatusBar } from './ui/statusBar';
import { Logger } from './utils/logger';

/**
 * Extension output channel for logging.
 */
let outputChannel: vscode.OutputChannel;

/**
 * Extension context singleton.
 */
let qadrContext: QADRContext;

/**
 * Status bar instance.
 */
let statusBar: StatusBar;

/**
 * Activate the QADR extension.
 *
 * Called when VS Code activates the extension based on activation events.
 *
 * @param context - VS Code extension context
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('QADR');
  context.subscriptions.push(outputChannel);

  // Initialize logger
  const logger = new Logger(outputChannel);
  logger.info('QADR extension activating...');

  try {
    // Initialize QADR context
    qadrContext = new QADRContext(context, logger);
    await qadrContext.initialize();

    // Create status bar
    statusBar = new StatusBar(context);
    statusBar.show();

    // Register tree view provider
    const treeProvider = new DependencyTreeProvider(qadrContext);
    const treeView = vscode.window.createTreeView('qadrDependencies', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Register diagnostics provider
    const diagnosticsProvider = new DiagnosticsProvider(qadrContext);
    context.subscriptions.push(diagnosticsProvider);

    // Register hover provider for package.json
    const hoverProvider = new HoverProvider(qadrContext);
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { pattern: '**/package.json' },
        hoverProvider
      )
    );

    // Register code action provider
    const codeActionProvider = new CodeActionProvider(qadrContext);
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { pattern: '**/package.json' },
        codeActionProvider,
        {
          providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds,
        }
      )
    );

    // Register completion provider for package.json
    const completionProvider = new CompletionProvider(qadrContext);
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        { pattern: '**/package.json' },
        completionProvider,
        '"', ':', ' '
      )
    );

    // Register commands
    registerCommands(context, qadrContext, treeProvider, statusBar);

    // Watch for manifest changes
    const manifestWatcher = vscode.workspace.createFileSystemWatcher(
      '**/package.json'
    );
    
    manifestWatcher.onDidChange(async (uri) => {
      const config = vscode.workspace.getConfiguration('qadr');
      if (config.get<boolean>('autoAnalyze')) {
        logger.info(`Manifest changed: ${uri.fsPath}`);
        await qadrContext.analyzeWorkspace(uri);
        treeProvider.refresh();
        diagnosticsProvider.refresh();
      }
    });
    
    context.subscriptions.push(manifestWatcher);

    // Set context for conditional UI
    await vscode.commands.executeCommand(
      'setContext',
      'qadr.hasManifest',
      qadrContext.hasManifest()
    );

    // Initial analysis if auto-analyze is enabled
    const config = vscode.workspace.getConfiguration('qadr');
    if (config.get<boolean>('autoAnalyze') && qadrContext.hasManifest()) {
      logger.info('Running initial dependency analysis...');
      await qadrContext.analyzeWorkspace();
      treeProvider.refresh();
      diagnosticsProvider.refresh();
      statusBar.update(qadrContext.getAnalysisStatus());
    }

    logger.info('QADR extension activated successfully!');
    vscode.window.showInformationMessage('QADR extension activated');

  } catch (error) {
    logger.error('Failed to activate QADR extension', error as Error);
    vscode.window.showErrorMessage(
      `QADR activation failed: ${(error as Error).message}`
    );
    throw error;
  }
}

/**
 * Deactivate the QADR extension.
 *
 * Called when VS Code deactivates the extension.
 */
export function deactivate(): void {
  if (qadrContext) {
    qadrContext.dispose();
  }
  
  if (outputChannel) {
    outputChannel.appendLine('QADR extension deactivated');
    outputChannel.dispose();
  }
}
