/**
 * Logger Utility
 *
 * Structured logging for the VS Code extension.
 *
 * @module @qadr/vscode/utils/logger
 */

import * as vscode from 'vscode';

/**
 * Log levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger for the QADR extension.
 */
export class Logger {
  private readonly _outputChannel: vscode.OutputChannel;
  private readonly _level: LogLevel;

  /**
   * Create a new logger.
   */
  constructor(outputChannel: vscode.OutputChannel, level: LogLevel = 'info') {
    this._outputChannel = outputChannel;
    this._level = level;
  }

  /**
   * Log a debug message.
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * Log an info message.
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, data);
    }
  }

  /**
   * Log a warning message.
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      this.log('WARN', message, data);
    }
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      this.log('ERROR', message);
      if (error) {
        this._outputChannel.appendLine(`  Error: ${error.message}`);
        if (error.stack) {
          this._outputChannel.appendLine(`  Stack: ${error.stack}`);
        }
      }
    }
  }

  /**
   * Check if a log level should be logged.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this._level);
  }

  /**
   * Write a log entry.
   */
  private log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message}`;
    
    this._outputChannel.appendLine(entry);
    
    if (data !== undefined) {
      this._outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
  }

  /**
   * Show the output channel.
   */
  show(): void {
    this._outputChannel.show();
  }
}
