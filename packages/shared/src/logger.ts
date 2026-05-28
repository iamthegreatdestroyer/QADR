/**
 * Logging utilities.
 *
 * Configurable logger with levels, formatters, and transports.
 */

/**
 * Log levels.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Numeric log levels for comparison.
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * Log entry structure.
 */
export interface ILogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: Date;
  /** Logger name/namespace */
  logger: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Error if present */
  error?: Error;
}

/**
 * Log transport interface.
 */
export interface ILogTransport {
  /** Write a log entry */
  write(entry: ILogEntry): void;
  /** Flush any buffered entries */
  flush?(): Promise<void>;
}

/**
 * Logger options.
 */
export interface ILoggerOptions {
  /** Logger name */
  name?: string;
  /** Minimum log level */
  level?: LogLevel;
  /** Log transports */
  transports?: ILogTransport[];
  /** Default context */
  context?: Record<string, unknown>;
}

/**
 * Console transport with colors.
 */
export class ConsoleTransport implements ILogTransport {
  private colors: boolean;

  constructor(options: { colors?: boolean } = {}) {
    this.colors = options.colors ?? true;
  }

  write(entry: ILogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = entry.logger ? `[${entry.logger}]` : '';

    let message = `${timestamp} ${level} ${logger} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      message += `\n${entry.error.stack ?? entry.error.message}`;
    }

    const method = this.getConsoleMethod(entry.level);
    if (this.colors) {
      console[method](this.colorize(entry.level, message));
    } else {
      console[method](message);
    }
  }

  private getConsoleMethod(level: LogLevel): 'log' | 'warn' | 'error' | 'debug' | 'trace' {
    switch (level) {
      case 'trace':
        return 'trace';
      case 'debug':
        return 'debug';
      case 'warn':
        return 'warn';
      case 'error':
      case 'fatal':
        return 'error';
      default:
        return 'log';
    }
  }

  private colorize(level: LogLevel, message: string): string {
    // ANSI color codes
    const colors: Record<LogLevel, string> = {
      trace: '\x1b[90m',  // Gray
      debug: '\x1b[36m',  // Cyan
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      fatal: '\x1b[35m',  // Magenta
    };

    const reset = '\x1b[0m';
    return `${colors[level]}${message}${reset}`;
  }
}

/**
 * JSON transport for structured logging.
 */
export class JsonTransport implements ILogTransport {
  private output: (json: string) => void;

  constructor(options: { output?: (json: string) => void } = {}) {
    this.output = options.output ?? console.log;
  }

  write(entry: ILogEntry): void {
    const json = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      logger: entry.logger,
      message: entry.message,
      ...entry.context,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
    });

    this.output(json);
  }
}

/**
 * Buffered transport that batches writes.
 */
export class BufferedTransport implements ILogTransport {
  private buffer: ILogEntry[] = [];
  private inner: ILogTransport;
  private maxSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    inner: ILogTransport,
    options: { maxSize?: number; flushInterval?: number } = {}
  ) {
    this.inner = inner;
    this.maxSize = options.maxSize ?? 100;
    this.flushInterval = options.flushInterval ?? 5000;

    if (this.flushInterval > 0) {
      this.timer = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  write(entry: ILogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= this.maxSize) {
      this.flushSync();
    }
  }

  async flush(): Promise<void> {
    this.flushSync();
  }

  private flushSync(): void {
    const entries = this.buffer;
    this.buffer = [];

    for (const entry of entries) {
      this.inner.write(entry);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.flushSync();
  }
}

/**
 * Logger instance.
 */
export class Logger {
  private name: string;
  private level: LogLevel;
  private transports: ILogTransport[];
  private context: Record<string, unknown>;

  constructor(options: ILoggerOptions = {}) {
    this.name = options.name ?? 'app';
    this.level = options.level ?? 'info';
    this.transports = options.transports ?? [new ConsoleTransport()];
    this.context = options.context ?? {};
  }

  /**
   * Create a child logger with additional context.
   */
  child(options: { name?: string; context?: Record<string, unknown> } = {}): Logger {
    return new Logger({
      name: options.name ?? this.name,
      level: this.level,
      transports: this.transports,
      context: { ...this.context, ...options.context },
    });
  }

  /**
   * Set the minimum log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Check if a level is enabled.
   */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Log at trace level.
   */
  trace(message: string, context?: Record<string, unknown>): void {
    this.log('trace', message, context);
  }

  /**
   * Log at debug level.
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log at info level.
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log at warn level.
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log at error level.
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const entry: ILogEntry = {
      level: 'error',
      message,
      timestamp: new Date(),
      logger: this.name,
      context: { ...this.context, ...context },
    };

    if (error instanceof Error) {
      entry.error = error;
    } else if (error !== undefined) {
      entry.context = { ...entry.context, errorData: error };
    }

    this.writeEntry(entry);
  }

  /**
   * Log at fatal level.
   */
  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const entry: ILogEntry = {
      level: 'fatal',
      message,
      timestamp: new Date(),
      logger: this.name,
      context: { ...this.context, ...context },
    };

    if (error instanceof Error) {
      entry.error = error;
    } else if (error !== undefined) {
      entry.context = { ...entry.context, errorData: error };
    }

    this.writeEntry(entry);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.isLevelEnabled(level)) return;

    this.writeEntry({
      level,
      message,
      timestamp: new Date(),
      logger: this.name,
      context: context ? { ...this.context, ...context } : this.context,
    });
  }

  private writeEntry(entry: ILogEntry): void {
    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Ignore transport errors
      }
    }
  }

  /**
   * Flush all transports.
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports
        .filter((t) => t.flush)
        .map((t) => t.flush!())
    );
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger();

/**
 * Create a named logger.
 */
export function createLogger(name: string, options?: Omit<ILoggerOptions, 'name'>): Logger {
  return new Logger({ ...options, name });
}
