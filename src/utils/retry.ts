/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * 重试错误类
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * 异步函数重试工具
 * 使用指数退避策略
 *
 * @param fn 要重试的异步函数
 * @param config 重试配置
 * @returns 函数执行结果
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | undefined;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // 调用重试回调
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, lastError);
      }

      // 计算退避延迟
      const currentDelay = Math.min(delay, finalConfig.maxDelay);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // 增加延迟（指数退避）
      delay *= finalConfig.backoffMultiplier;
    }
  }

  throw new RetryError(
    `重试 ${finalConfig.maxAttempts} 次后仍然失败`,
    finalConfig.maxAttempts,
    lastError!
  );
}

/**
 * 同步函数重试工具
 *
 * @param fn 要重试的同步函数
 * @param config 重试配置
 * @returns 函数执行结果
 */
export function retryWithBackoffSync<T>(
  fn: () => T,
  config: Partial<RetryConfig> = {}
): T {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | undefined;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // 调用重试回调
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, lastError);
      }

      // 计算退避延迟
      const currentDelay = Math.min(delay, finalConfig.maxDelay);

      // 阻塞等待（同步重试）
      const start = Date.now();
      while (Date.now() - start < currentDelay) {
        // 空循环等待
      }

      // 增加延迟（指数退避）
      delay *= finalConfig.backoffMultiplier;
    }
  }

  throw new RetryError(
    `重试 ${finalConfig.maxAttempts} 次后仍然失败`,
    finalConfig.maxAttempts,
    lastError!
  );
}

/**
 * 判断错误是否可重试
 */
export function isRetriableError(error: Error): boolean {
  // 网络错误
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
    return true;
  }

  // HTTP 429 (Too Many Requests)
  if (error.message.includes('429')) {
    return true;
  }

  // HTTP 5xx (服务器错误)
  if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
    return true;
  }

  return false;
}

export default retryWithBackoff;
