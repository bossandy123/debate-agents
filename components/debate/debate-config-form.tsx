"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ValidationError {
  field: string;
  message: string;
}

interface AgentConfig {
  role: "debater" | "judge" | "audience";
  stance?: "pro" | "con";
  model_provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  style_tag?: string;
  audience_type?: string;
}

interface AudienceConfig {
  id: string;
  audience_type: string;
  model_provider: string;
  model_name: string;
  api_key: string;
  base_url: string;
}

export function DebateConfigForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 观众列表状态
  const [audiences, setAudiences] = useState<AudienceConfig[]>([
    {
      id: "audience-1",
      audience_type: "rational",
      model_provider: "openai",
      model_name: "",
      api_key: "",
      base_url: "",
    },
  ]);

  // 客户端验证
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 验证观众列表
    if (audiences.length === 0) {
      errors.push({ field: "audiences", message: "至少需要一个观众" });
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const formData = new FormData(e.currentTarget);
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          data[key] = value;
        }
      });

      // 验证基本字段
      const errors: ValidationError[] = [];

      // 验证辩题
      if (!data.topic || data.topic.trim().length === 0) {
        errors.push({ field: "topic", message: "辩题不能为空" });
      } else if (data.topic.trim().length > 500) {
        errors.push({ field: "topic", message: "辩题不能超过500个字符" });
      } else if (data.topic.trim().length < 5) {
        errors.push({ field: "topic", message: "辩题至少需要5个字符" });
      }

      // 验证轮数
      const maxRounds = parseInt(data.max_rounds || "10", 10);
      if (isNaN(maxRounds) || maxRounds < 1 || maxRounds > 20) {
        errors.push({ field: "max_rounds", message: "轮数必须在1-20之间" });
      }

      // 验证裁判权重
      const judgeWeight = parseFloat(data.judge_weight || "0.7");
      if (isNaN(judgeWeight) || judgeWeight < 0 || judgeWeight > 1) {
        errors.push({ field: "judge_weight", message: "裁判权重必须在0-1之间" });
      }

      // 客户端验证（观众）
      const audienceErrors = validateForm();
      errors.push(...audienceErrors);

      if (errors.length > 0) {
        const errorsMap: Record<string, string> = {};
        errors.forEach((err) => {
          errorsMap[err.field] = err.message;
        });
        setFieldErrors(errorsMap);
        setError("请修正表单中的错误");
        setIsSubmitting(false);
        return;
      }

      // 构建 agents 数组
      const agents: AgentConfig[] = [];

      // 辅助函数：只在有值时添加字段
      const addOptionalField = (obj: AgentConfig, key: "api_key" | "base_url", value: string | undefined) => {
        if (value && value.trim()) {
          (obj as unknown as Record<string, string>)[key] = value;
        }
      };

      // 正方辩手
      const proAgent: AgentConfig = {
        role: "debater",
        stance: "pro",
        model_provider: data.pro_provider,
        model_name: data.pro_model,
        style_tag: data.pro_style,
      };
      addOptionalField(proAgent, "api_key", data.pro_api_key);
      addOptionalField(proAgent, "base_url", data.pro_base_url);
      agents.push(proAgent);

      // 反方辩手
      const conAgent: AgentConfig = {
        role: "debater",
        stance: "con",
        model_provider: data.con_provider,
        model_name: data.con_model,
        style_tag: data.con_style,
      };
      addOptionalField(conAgent, "api_key", data.con_api_key);
      addOptionalField(conAgent, "base_url", data.con_base_url);
      agents.push(conAgent);

      // 裁判
      const judgeAgent: AgentConfig = {
        role: "judge",
        model_provider: data.judge_provider,
        model_name: data.judge_model,
      };
      addOptionalField(judgeAgent, "api_key", data.judge_api_key);
      addOptionalField(judgeAgent, "base_url", data.judge_base_url);
      agents.push(judgeAgent);

      // 添加观众（使用动态列表）
      for (const audience of audiences) {
        const audienceAgent: AgentConfig = {
          role: "audience",
          model_provider: audience.model_provider,
          model_name: audience.model_name || "gpt-3.5-turbo",
          audience_type: audience.audience_type,
        };

        // 只在有值时添加 api_key 和 base_url
        if (audience.api_key && audience.api_key.trim()) {
          audienceAgent.api_key = audience.api_key;
        }
        if (audience.base_url && audience.base_url.trim()) {
          audienceAgent.base_url = audience.base_url;
        }

        agents.push(audienceAgent);
      }

      const response = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: data.topic,
          pro_definition: data.pro_definition || undefined,
          con_definition: data.con_definition || undefined,
          max_rounds: parseInt(data.max_rounds, 10),
          judge_weight: parseFloat(data.judge_weight),
          audience_weight: 1 - parseFloat(data.judge_weight),
          agents,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 处理服务器返回的验证错误
        if (result.details && Array.isArray(result.details)) {
          const errorsMap: Record<string, string> = {};
          result.details.forEach((detail: string) => {
            // 尝试从错误消息中提取字段名
            const match = detail.match(/(\w+)\s+/);
            if (match) {
              errorsMap[match[1]] = detail;
            } else {
              setError(detail);
            }
          });
          if (Object.keys(errorsMap).length > 0) {
            setFieldErrors(errorsMap);
          }
        }
        throw new Error(result.error || "创建辩论失败");
      }

      // 跳转到辩论详情页，用户需要手动点击启动按钮
      router.push(`/debate/${result.id}`);
    } catch (err) {
      if (!error) {  // 只在没有设置错误时设置
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 观众管理函数
  const addAudience = () => {
    const newId = `audience-${audiences.length + 1}`;
    setAudiences([
      ...audiences,
      {
        id: newId,
        audience_type: "rational",
        model_provider: "openai",
        model_name: "",
        api_key: "",
        base_url: "",
      },
    ]);
  };

  const removeAudience = (id: string) => {
    if (audiences.length <= 1) {
      setError("至少需要一个观众");
      return;
    }
    setAudiences(audiences.filter((a) => a.id !== id));
  };

  const updateAudience = (id: string, field: keyof AudienceConfig, value: string | boolean) => {
    setAudiences(
      audiences.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* 辩题 */}
      <div className="space-y-2">
        <label htmlFor="topic" className="block text-sm font-medium">
          辩题 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="topic"
          name="topic"
          required
          maxLength={500}
          placeholder="例如：人工智能是否会取代人类工作"
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
            fieldErrors.topic ? "border-destructive" : ""
          }`}
        />
        {fieldErrors.topic && (
          <p className="text-sm text-destructive">{fieldErrors.topic}</p>
        )}
      </div>

      {/* 立场定义 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="pro_definition" className="block text-sm font-medium">
            正方立场定义
          </label>
          <textarea
            id="pro_definition"
            name="pro_definition"
            rows={3}
            placeholder="正方认为..."
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              fieldErrors.pro_definition ? "border-destructive" : ""
            }`}
          />
          {fieldErrors.pro_definition && (
            <p className="text-sm text-destructive">{fieldErrors.pro_definition}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="con_definition" className="block text-sm font-medium">
            反方立场定义
          </label>
          <textarea
            id="con_definition"
            name="con_definition"
            rows={3}
            placeholder="反方认为..."
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              fieldErrors.con_definition ? "border-destructive" : ""
            }`}
          />
          {fieldErrors.con_definition && (
            <p className="text-sm text-destructive">{fieldErrors.con_definition}</p>
          )}
        </div>
      </div>

      {/* 辩论配置 */}
      <div className="border-t pt-6 space-y-6">
        <h2 className="text-xl font-semibold">辩论配置</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="max_rounds" className="block text-sm font-medium">
              最大轮数 <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="max_rounds"
              name="max_rounds"
              min={1}
              max={20}
              defaultValue={10}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldErrors.max_rounds && (
              <p className="text-sm text-destructive">{fieldErrors.max_rounds}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="judge_weight" className="block text-sm font-medium">
              裁判权重 <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="judge_weight"
              name="judge_weight"
              min={0}
              max={1}
              step={0.1}
              defaultValue={0.7}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldErrors.judge_weight && (
              <p className="text-sm text-destructive">{fieldErrors.judge_weight}</p>
            )}
            <p className="text-xs text-muted-foreground">0-1之间，观众权重自动计算为 1 - 裁判权重</p>
          </div>
        </div>
      </div>

      {/* Agent 配置 */}
      <div className="border-t pt-6 space-y-6">
        <h2 className="text-xl font-semibold">Agent 配置</h2>

        {/* 正方辩手 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">正方辩手</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">协议类型</label>
              <select
                name="pro_provider"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI 兼容协议</option>
                <option value="anthropic">Anthropic 兼容协议</option>
                <option value="google">Google 兼容协议</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">风格</label>
              <select
                name="pro_style"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rational">理性逻辑派</option>
                <option value="aggressive">激进攻击派</option>
                <option value="conservative">保守防御派</option>
                <option value="technical">技术专业派</option>
              </select>
            </div>
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">模型名称 *</label>
            <input
              type="text"
              name="pro_model"
              placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">填写端点支持的模型名称</p>
          </div>

          {/* API 端点 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">API 端点</label>
            <input
              type="url"
              name="pro_base_url"
              placeholder="可选：自定义端点（留空使用官方地址）"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">例如使用代理时填写</p>
          </div>

          {/* API 密钥 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">API 密钥</label>
            <input
              type="password"
              name="pro_api_key"
              placeholder="可选：留空使用环境变量中的默认密钥"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">留空则使用环境变量中的默认密钥</p>
          </div>
        </div>

        {/* 反方辩手 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">反方辩手</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">协议类型</label>
              <select
                name="con_provider"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI 兼容协议</option>
                <option value="anthropic">Anthropic 兼容协议</option>
                <option value="google">Google 兼容协议</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">风格</label>
              <select
                name="con_style"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rational">理性逻辑派</option>
                <option value="aggressive">激进攻击派</option>
                <option value="conservative">保守防御派</option>
                <option value="technical">技术专业派</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">模型名称 *</label>
            <input
              type="text"
              name="con_model"
              placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">填写端点支持的模型名称</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">API 端点</label>
            <input
              type="url"
              name="con_base_url"
              placeholder="可选：自定义端点（留空使用官方地址）"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">例如使用代理时填写</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">API 密钥</label>
            <input
              type="password"
              name="con_api_key"
              placeholder="可选：留空使用环境变量中的默认密钥"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">留空则使用环境变量中的默认密钥</p>
          </div>
        </div>

        {/* 裁判 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">裁判</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">协议类型</label>
            <select
              name="judge_provider"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="openai">OpenAI 兼容协议</option>
              <option value="anthropic">Anthropic 兼容协议</option>
              <option value="google">Google 兼容协议</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">模型名称 *</label>
            <input
              type="text"
              name="judge_model"
              placeholder="例如: gpt-4, claude-3-opus, gemini-pro"
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">填写端点支持的模型名称</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">API 端点</label>
            <input
              type="url"
              name="judge_base_url"
              placeholder="可选：自定义端点（留空使用官方地址）"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">例如使用代理时填写</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">API 密钥</label>
            <input
              type="password"
              name="judge_api_key"
              placeholder="可选：留空使用环境变量中的默认密钥"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">留空则使用环境变量中的默认密钥</p>
          </div>
        </div>

        {/* 观众 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">观众 ({audiences.length})</h3>
            <button
              type="button"
              onClick={addAudience}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + 添加观众
            </button>
          </div>

          {audiences.map((audience, index) => (
            <div key={audience.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">观众 {index + 1}</h4>
                {audiences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAudience(audience.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    删除
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* 观众类型 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">类型</label>
                  <select
                    value={audience.audience_type}
                    onChange={(e) => updateAudience(audience.id, "audience_type", e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="rational">理性逻辑派</option>
                    <option value="pragmatic">现实可行性派</option>
                    <option value="technical">技术专业派</option>
                    <option value="risk-averse">风险厌恶派</option>
                    <option value="emotional">情感共鸣派</option>
                  </select>
                </div>

                {/* 协议类型 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">协议类型</label>
                  <select
                    value={audience.model_provider}
                    onChange={(e) => updateAudience(audience.id, "model_provider", e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="openai">OpenAI 兼容协议</option>
                    <option value="anthropic">Anthropic 兼容协议</option>
                    <option value="google">Google 兼容协议</option>
                  </select>
                </div>
              </div>

              {/* 模型名称 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">模型名称</label>
                <input
                  type="text"
                  value={audience.model_name}
                  onChange={(e) => updateAudience(audience.id, "model_name", e.target.value)}
                  placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">填写端点支持的模型名称（留空使用默认模型）</p>
              </div>

              {/* API 端点 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">API 端点</label>
                <input
                  type="url"
                  value={audience.base_url}
                  onChange={(e) => updateAudience(audience.id, "base_url", e.target.value)}
                  placeholder="可选：自定义端点（留空使用官方地址）"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">例如使用代理时填写</p>
              </div>

              {/* API 密钥 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">API 密钥</label>
                <input
                  type="password"
                  value={audience.api_key}
                  onChange={(e) => updateAudience(audience.id, "api_key", e.target.value)}
                  placeholder="可选：留空使用环境变量中的默认密钥"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">留空则使用环境变量中的默认密钥</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "创建中..." : "创建辩论"}
        </button>
        <Link
          href="/"
          className="px-6 py-2 border rounded-md hover:bg-accent transition-colors"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
