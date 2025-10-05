/**
 * Logger interface for the application.
 */
export interface ILogger {
  /**
   * Log an informational message.
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a warning message.
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an error message.
   */
  error(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message.
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context.
   */
  child(context: Record<string, unknown>): ILogger;
}
