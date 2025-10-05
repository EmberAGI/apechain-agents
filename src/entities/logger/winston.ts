import winston from "winston";
import { ILogger } from "../../domain/logger.js";

/**
 * Winston-based logger implementation.
 */
export class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor(private logLevel: string = "info", logger?: winston.Logger) {
    this.logger = logger || this.createDefaultLogger();
  }

  private createDefaultLogger(): winston.Logger {
    return winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? ` ${JSON.stringify(meta)}`
                : "";
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            }),
          ),
        }),
      ],
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  child(context: Record<string, unknown>): ILogger {
    return new WinstonLogger(this.logLevel, this.logger.child(context));
  }
}
