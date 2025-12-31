/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
}

/**
 * 日志工具类
 * 提供中文日志输出
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level || LogLevel.INFO,
      enableConsole: config?.enableConsole ?? true,
      enableFile: config?.enableFile ?? false,
      filePath: config?.filePath,
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 判断是否应该输出该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  /**
   * 格式化日志消息
   */
  private format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  /**
   * 输出日志
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.format(level, message, meta);

    if (this.config.enableConsole) {
      const consoleMethod = level === LogLevel.DEBUG ? 'debug' : level.toLowerCase();
      // @ts-expect-error - console debug 方法可能在某些环境中不存在
      console[consoleMethod] ?? console.log(formattedMessage);
    }
  }

  /**
   * DEBUG级别日志
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * INFO级别日志
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * WARN级别日志
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * ERROR级别日志
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }
}

// 默认日志实例
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  enableConsole: true,
});

export default logger;
