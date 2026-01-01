# 贡献指南

感谢您对多模型 Agent 辩论系统的关注！欢迎贡献代码、报告问题或提出建议。

## 开发环境设置

### 前置要求

- Node.js 20 或更高版本
- npm 或 pnpm

### 安装步骤

1. Fork 并克隆仓库
```bash
git clone https://github.com/<your-username>/debate-agents.git
cd debate-agents
```

2. 安装依赖
```bash
npm install
```

3. 创建环境变量文件
```bash
cp .env.local.example .env.local
```

4. 配置 API 密钥
编辑 `.env.local` 文件，添加必要的 API 密钥。

## 开发流程

### 分支策略

- `main` - 主分支，保持稳定
- `001-multi-agent-debate` - 开发分支
- 从 `001-multi-agent-debate` 创建功能分支

### 提交规范

使用约定式提交（Conventional Commits）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型:**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

**示例:**
```
feat(debate): 添加观众申请发言功能

- 实现 audience-request repository
- 添加 judge 审批 prompt
- 更新 debate-service 集成流程

Closes #42
```

### 代码风格

本项目使用：
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查

提交前请确保：
```bash
npm run lint
npm run build
```

## 测试

### 运行测试

```bash
# 所有测试
npm test

# 单元测试
npm test -- tests/unit

# 集成测试
npm test -- tests/integration

# 查看 UI
npm test:ui
```

### 编写测试

- 使用 **Vitest** 作为测试框架
- 测试文件命名: `*.test.ts`
- 测试文件位置: `tests/unit/`, `tests/integration/`, `tests/e2e/`

**示例:**
```typescript
import { describe, it, expect } from "vitest";

describe("Debate Service", () => {
  it("should create a new debate", () => {
    const debate = debateRepository.create({
      topic: "测试辩题",
      max_rounds: 10,
      judge_weight: 0.5,
      audience_weight: 0.5,
    });
    expect(debate).toHaveProperty("id");
  });
});
```

## 项目结构

```
lib/
├── agents/          # LangChain agents
│   ├── chains/      # Chain 实现
│   ├── prompts/     # Prompt 模板
│   └── tools/       # LangChain tools
├── db/              # 数据库
│   ├── client.ts    # 数据库客户端
│   └── schema.ts    # Schema 定义
├── models/          # 数据模型
├── repositories/    # 数据访问层
└── services/        # 业务服务
```

### 添加新功能

1. **数据模型**: 在 `lib/models/` 定义类型
2. **Repository**: 在 `lib/repositories/` 实现数据访问
3. **Service**: 在 `lib/services/` 实现业务逻辑
4. **API**: 在 `app/api/` 添加路由
5. **测试**: 在 `tests/` 添加测试

## Pull Request 流程

1. 更新分支
```bash
git fetch origin
git rebase origin/001-multi-agent-debate
```

2. 推送到您的 fork
```bash
git push origin feature-branch
```

3. 创建 Pull Request
- 描述变更内容
- 关联相关 Issue
- 确保 CI 检查通过

## 代码审查标准

- **类型安全**: 无 TypeScript 错误
- **代码风格**: 通过 ESLint 检查
- **测试覆盖**: 新功能需有测试
- **文档**: 更新相关文档
- **中文注释**: 代码注释使用中文

## 报告问题

通过 GitHub Issues 报告问题，请包含：

1. 问题描述
2. 复现步骤
3. 期望行为
4. 实际行为
5. 环境信息（OS、Node 版本等）

## 行为准则

- 尊重所有贡献者
- 建设性讨论
- 接受反馈并改进
- 关注问题而非个人

## 许可证

提交代码即表示您同意您的贡献将在 MIT 许可证下发布。
