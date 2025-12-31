/**
 * 日志工具
 * 提供结构化的日志记录功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // 根据环境变量设置日志级别
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case "DEBUG":
        this.minLevel = LogLevel.DEBUG;
        break;
      case "INFO":
        this.minLevel = LogLevel.INFO;
        break;
      case "WARN":
        this.minLevel = LogLevel.WARN;
        break;
      case "ERROR":
        this.minLevel = LogLevel.ERROR;
        break;
      default:
        this.minLevel =
          process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : "";
    const errorStr = entry.error ? ` ${entry.error.stack}` : "";
    return `[${entry.timestamp}] [${levelName}] ${entry.message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      error,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

/**
 * 全局 Logger 实例
 */
const logger = new Logger();

export default logger;
