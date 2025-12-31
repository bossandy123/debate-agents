/**
 * 环境变量配置管理
 * 提供类型安全的环境变量访问
 */

/**
 * 环境变量配置
 */
export interface Config {
  // LLM API Keys
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  deepseekApiKey?: string;

  // LangSmith (可选)
  langchainTracingV2: boolean;
  langchainApiKey?: string;
  langchainProject: string;

  // 数据库
  databasePath: string;

  // 应用配置
  nodeEnv: string;
  port: number;
}

/**
 * 获取环境变量值
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * 获取可选环境变量值
 */
function getOptionalEnvVar(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/**
 * 加载配置
 */
export function loadConfig(): Config {
  return {
    // LLM API Keys
    openaiApiKey: getOptionalEnvVar("OPENAI_API_KEY"),
    anthropicApiKey: getOptionalEnvVar("ANTHROPIC_API_KEY"),
    googleApiKey: getOptionalEnvVar("GOOGLE_API_KEY"),
    deepseekApiKey: getOptionalEnvVar("DEEPSEEK_API_KEY"),

    // LangSmith
    langchainTracingV2:
      getEnvVar("LANGCHAIN_TRACING_V2", "false") === "true",
    langchainApiKey: getOptionalEnvVar("LANGCHAIN_API_KEY"),
    langchainProject: getEnvVar("LANGCHAIN_PROJECT", "debate-agents"),

    // 数据库
    databasePath: getEnvVar("DATABASE_PATH", "./data/debates.db"),

    // 应用配置
    nodeEnv: getEnvVar("NODE_ENV", "development"),
    port: parseInt(getEnvVar("PORT", "3000"), 10),
  };
}

/**
 * 全局配置实例
 */
let configInstance: Config | null = null;

/**
 * 获取配置单例
 */
export function getConfig(): Config {
  if (configInstance === null) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === "production";
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === "development";
}

/**
 * 检查是否为测试环境
 */
export function isTest(): boolean {
  return getConfig().nodeEnv === "test";
}

/**
 * 验证必需的 API Keys
 */
export function validateApiKeys(): {
  valid: boolean;
  missing: string[];
} {
  const config = getConfig();
  const missing: string[] = [];

  // 至少需要一个 LLM API Key
  if (
    !config.openaiApiKey &&
    !config.anthropicApiKey &&
    !config.googleApiKey &&
    !config.deepseekApiKey
  ) {
    missing.push(
      "至少需要一个 LLM API Key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, 或 DEEPSEEK_API_KEY)"
    );
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
