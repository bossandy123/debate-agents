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
  style_tag?: string;
  audience_type?: string;
}

export function DebateConfigForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 客户端验证
  const validateForm = (data: Record<string, string>): ValidationError[] => {
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

    // 验证观众数量
    const audienceCount = parseInt(data.audience_count || "5", 10);
    if (isNaN(audienceCount) || audienceCount < 1 || audienceCount > 50) {
      errors.push({ field: "audience_count", message: "观众数量必须在1-50之间" });
    }

    // 验证模型选择
    if (!data.pro_model) {
      errors.push({ field: "pro_model", message: "请选择正方辩手模型" });
    }
    if (!data.con_model) {
      errors.push({ field: "con_model", message: "请选择反方辩手模型" });
    }
    if (!data.judge_model) {
      errors.push({ field: "judge_model", message: "请选择裁判模型" });
    }

    // 验证立场定义长度（如果提供）
    if (data.pro_definition && data.pro_definition.length > 1000) {
      errors.push({ field: "pro_definition", message: "正方立场定义不能超过1000个字符" });
    }
    if (data.con_definition && data.con_definition.length > 1000) {
      errors.push({ field: "con_definition", message: "反方立场定义不能超过1000个字符" });
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

      // 客户端验证
      const validationErrors = validateForm(data);
      if (validationErrors.length > 0) {
        const errorsMap: Record<string, string> = {};
        validationErrors.forEach((err) => {
          errorsMap[err.field] = err.message;
        });
        setFieldErrors(errorsMap);
        setError("请修正表单中的错误");
        setIsSubmitting(false);
        return;
      }

      // 构建 agents 数组
      const agents: AgentConfig[] = [
        {
          role: "debater",
          stance: "pro",
          model_provider: getProviderFromModel(data.pro_model),
          model_name: data.pro_model,
          style_tag: data.pro_style,
        },
        {
          role: "debater",
          stance: "con",
          model_provider: getProviderFromModel(data.con_model),
          model_name: data.con_model,
          style_tag: data.con_style,
        },
        {
          role: "judge",
          model_provider: getProviderFromModel(data.judge_model),
          model_name: data.judge_model,
        },
      ];

      // 添加观众
      const audienceCount = parseInt(data.audience_count, 10);
      for (let i = 0; i < audienceCount; i++) {
        agents.push({
          role: "audience",
          model_provider: "openai", // 默认使用 OpenAI
          model_name: "gpt-3.5-turbo",
          audience_type: data.audience_type,
        });
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

      // 跳转到辩论详情页
      router.push(`/debate/${result.id}`);
    } catch (err) {
      if (!error) {  // 只在没有设置错误时设置
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  function getProviderFromModel(modelName: string): string {
    if (modelName.startsWith("gpt")) return "openai";
    if (modelName.startsWith("claude")) return "anthropic";
    if (modelName.startsWith("gemini")) return "google";
    if (modelName.startsWith("deepseek")) return "deepseek";
    return "openai";
  }

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
              <label className="block text-sm font-medium">模型</label>
              <select
                name="pro_model"
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="gemini-pro">Gemini Pro</option>
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
        </div>

        {/* 反方辩手 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">反方辩手</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">模型</label>
              <select
                name="con_model"
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="gemini-pro">Gemini Pro</option>
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
        </div>

        {/* 裁判 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">裁判</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">模型</label>
            <select
              name="judge_model"
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
          </div>
        </div>

        {/* 观众 */}
        <div className="space-y-3 p-4 border rounded-lg">
          <h3 className="font-medium">观众</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">类型</label>
              <select
                name="audience_type"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rational">理性逻辑派</option>
                <option value="pragmatic">现实可行性派</option>
                <option value="technical">技术专业派</option>
                <option value="risk-averse">风险厌恶派</option>
                <option value="emotional">情感共鸣派</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">数量</label>
              <input
                type="number"
                name="audience_count"
                min={1}
                max={10}
                defaultValue={5}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
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
