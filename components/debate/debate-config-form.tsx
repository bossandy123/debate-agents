"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="glass-card p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-2xl animate-fade-in-down">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Main Card - Topic & Stance */}
      <div className="glass-card-elevated rounded-3xl p-8 space-y-8 hover-lift">
        {/* 辩题 */}
        <div className="space-y-3">
          <Label htmlFor="topic" required>
            辩题
          </Label>
          <Input
            type="text"
            id="topic"
            name="topic"
            required
            maxLength={500}
            placeholder="例如：人工智能是否会取代人类工作"
            error={fieldErrors.topic}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">5-500 个字符</p>
        </div>

        {/* 立场定义 */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label htmlFor="pro_definition">正方立场定义</Label>
            <Textarea
              id="pro_definition"
              name="pro_definition"
              rows={4}
              placeholder="正方认为..."
              error={fieldErrors.pro_definition}
              className="resize-none"
            />
            <Badge variant="pro" className="mt-2">正方</Badge>
          </div>
          <div className="space-y-3">
            <Label htmlFor="con_definition">反方立场定义</Label>
            <Textarea
              id="con_definition"
              name="con_definition"
              rows={4}
              placeholder="反方认为..."
              error={fieldErrors.con_definition}
              className="resize-none"
            />
            <Badge variant="con" className="mt-2">反方</Badge>
          </div>
        </div>
      </div>

      {/* Debate Configuration Card */}
      <div className="glass-card rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">辩论配置</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="max_rounds" required>
              最大轮数
            </Label>
            <Input
              type="number"
              id="max_rounds"
              name="max_rounds"
              min={1}
              max={20}
              defaultValue={10}
              error={fieldErrors.max_rounds}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="judge_weight" required>
              裁判权重
            </Label>
            <Input
              type="number"
              id="judge_weight"
              name="judge_weight"
              min={0}
              max={1}
              step={0.1}
              defaultValue={0.7}
              error={fieldErrors.judge_weight}
            />
            <p className="text-sm text-muted-foreground">观众权重自动计算为 1 - 裁判权重</p>
          </div>
        </div>
      </div>

      {/* Agent Configuration Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-audience/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-audience" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Agent 配置</h2>
        </div>

        {/* 正方辩手 */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-pro/10 to-transparent px-8 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Badge variant="pro" size="md" className="text-sm font-semibold">正方</Badge>
              <h3 className="text-lg font-semibold">正方辩手配置</h3>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>协议类型</Label>
                <Select name="pro_provider">
                  <option value="openai">OpenAI 兼容协议</option>
                  <option value="anthropic">Anthropic 兼容协议</option>
                  <option value="google">Google 兼容协议</option>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>辩论风格</Label>
                <Select name="pro_style">
                  <option value="rational">理性逻辑派</option>
                  <option value="aggressive">激进攻击派</option>
                  <option value="conservative">保守防御派</option>
                  <option value="technical">技术专业派</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label required>模型名称</Label>
              <Input
                type="text"
                name="pro_model"
                placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
                required
              />
              <p className="text-sm text-muted-foreground">填写端点支持的模型名称</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>API 端点</Label>
                <Input
                  type="url"
                  name="pro_base_url"
                  placeholder="可选：自定义端点"
                />
                <p className="text-sm text-muted-foreground">留空使用官方地址</p>
              </div>
              <div className="space-y-3">
                <Label>API 密钥</Label>
                <Input
                  type="password"
                  name="pro_api_key"
                  placeholder="可选：留空使用环境变量"
                />
                <p className="text-sm text-muted-foreground">留空则使用环境变量中的默认密钥</p>
              </div>
            </div>
          </div>
        </div>

        {/* 反方辩手 */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-con/10 to-transparent px-8 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Badge variant="con" size="md" className="text-sm font-semibold">反方</Badge>
              <h3 className="text-lg font-semibold">反方辩手配置</h3>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>协议类型</Label>
                <Select name="con_provider">
                  <option value="openai">OpenAI 兼容协议</option>
                  <option value="anthropic">Anthropic 兼容协议</option>
                  <option value="google">Google 兼容协议</option>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>辩论风格</Label>
                <Select name="con_style">
                  <option value="rational">理性逻辑派</option>
                  <option value="aggressive">激进攻击派</option>
                  <option value="conservative">保守防御派</option>
                  <option value="technical">技术专业派</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label required>模型名称</Label>
              <Input
                type="text"
                name="con_model"
                placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
                required
              />
              <p className="text-sm text-muted-foreground">填写端点支持的模型名称</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>API 端点</Label>
                <Input
                  type="url"
                  name="con_base_url"
                  placeholder="可选：自定义端点"
                />
                <p className="text-sm text-muted-foreground">留空使用官方地址</p>
              </div>
              <div className="space-y-3">
                <Label>API 密钥</Label>
                <Input
                  type="password"
                  name="con_api_key"
                  placeholder="可选：留空使用环境变量"
                />
                <p className="text-sm text-muted-foreground">留空则使用环境变量中的默认密钥</p>
              </div>
            </div>
          </div>
        </div>

        {/* 裁判 */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-transparent px-8 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Badge variant="default" size="md" className="text-sm font-semibold">裁判</Badge>
              <h3 className="text-lg font-semibold">裁判配置</h3>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label>协议类型</Label>
              <Select name="judge_provider">
                <option value="openai">OpenAI 兼容协议</option>
                <option value="anthropic">Anthropic 兼容协议</option>
                <option value="google">Google 兼容协议</option>
              </Select>
            </div>

            <div className="space-y-3">
              <Label required>模型名称</Label>
              <Input
                type="text"
                name="judge_model"
                placeholder="例如: gpt-4, claude-3-opus, gemini-pro"
                required
              />
              <p className="text-sm text-muted-foreground">填写端点支持的模型名称</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>API 端点</Label>
                <Input
                  type="url"
                  name="judge_base_url"
                  placeholder="可选：自定义端点"
                />
                <p className="text-sm text-muted-foreground">留空使用官方地址</p>
              </div>
              <div className="space-y-3">
                <Label>API 密钥</Label>
                <Input
                  type="password"
                  name="judge_api_key"
                  placeholder="可选：留空使用环境变量"
                />
                <p className="text-sm text-muted-foreground">留空则使用环境变量中的默认密钥</p>
              </div>
            </div>
          </div>
        </div>

        {/* 观众 */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-audience/10 to-transparent px-8 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="audience" size="md" className="text-sm font-semibold">观众</Badge>
                <h3 className="text-lg font-semibold">观众配置</h3>
                <Badge variant="secondary">{audiences.length}</Badge>
              </div>
              <button
                type="button"
                onClick={addAudience}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加观众
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {audiences.map((audience, index) => (
              <div key={audience.id} className="glass-card rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-audience/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-audience">{index + 1}</span>
                    </div>
                    <h4 className="font-semibold">观众 {index + 1}</h4>
                  </div>
                  {audiences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAudience(audience.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>观众类型</Label>
                    <select
                      value={audience.audience_type}
                      onChange={(e) => updateAudience(audience.id, "audience_type", e.target.value)}
                      className="flex h-11 w-full appearance-none rounded-xl border border-input bg-card px-4 py-2 text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="rational">理性逻辑派</option>
                      <option value="pragmatic">现实可行性派</option>
                      <option value="technical">技术专业派</option>
                      <option value="risk-averse">风险厌恶派</option>
                      <option value="emotional">情感共鸣派</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <Label>协议类型</Label>
                    <select
                      value={audience.model_provider}
                      onChange={(e) => updateAudience(audience.id, "model_provider", e.target.value)}
                      className="flex h-11 w-full appearance-none rounded-xl border border-input bg-card px-4 py-2 text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="openai">OpenAI 兼容协议</option>
                      <option value="anthropic">Anthropic 兼容协议</option>
                      <option value="google">Google 兼容协议</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>模型名称</Label>
                  <Input
                    type="text"
                    value={audience.model_name}
                    onChange={(e) => updateAudience(audience.id, "model_name", e.target.value)}
                    placeholder="例如: gpt-4, claude-3-opus, gemini-pro, qwen3-max"
                  />
                  <p className="text-sm text-muted-foreground">留空使用默认模型</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>API 端点</Label>
                    <Input
                      type="url"
                      value={audience.base_url}
                      onChange={(e) => updateAudience(audience.id, "base_url", e.target.value)}
                      placeholder="可选：自定义端点"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>API 密钥</Label>
                    <Input
                      type="password"
                      value={audience.api_key}
                      onChange={(e) => updateAudience(audience.id, "api_key", e.target.value)}
                      placeholder="可选：留空使用环境变量"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="flex-1 h-12 text-base shadow-glow-sm"
        >
          {isSubmitting ? "创建中..." : "创建辩论"}
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 h-12 rounded-xl font-medium border border-border hover:bg-muted transition-all duration-300 ease-out-expo active:scale-95"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
