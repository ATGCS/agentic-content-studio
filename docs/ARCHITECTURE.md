# Agentic Content Studio 架构分层

## 四层职责

| 层级        | 包                                                                   | 职责                                                       |
| ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| L0 基础设施 | `@acs/db`、`@acs/core`                                               | 数据模型、通用错误、RBAC                                   |
| L1 基础能力 | `@acs/ai-runtime`、`@acs/ima-provider`、`@acs/image-provider`        | 模型调用、Agent 执行循环、知识检索/同步、图片生成          |
| L2 业务配置 | `@acs/studio-agents`                                                 | Agent 写库 Applier、知识库 Agent 映射、Seedream 提示词组装 |
| L3 业务编排 | `@acs/studio-workflows`、`@acs/studio-butler`、`@acs/content-center` | 内容流水线、对话编排、领域 CRUD                            |
| L4 应用     | `apps/web`、`apps/api`                                               | HTTP、UI、鉴权、启动 bootstrap                             |

## 依赖铁律

1. **L1 禁止依赖** `studio-*` 包
2. **L1 禁止直接写** `contents`、`topics`、`materials` 等业务表（读上下文除外，后续抽 Repository）
3. **业务写库** 集中在 `studio-agents`（Applier）与 `content-center`（CRUD）
4. **新编排流程** 进 `studio-workflows`，不进 `ai-runtime`
5. **应用启动** 必须调用 `registerStudioAgents()` 注册 Applier 与知识库映射

## 新功能决策树

```
新需求
 ├─ 原子能力（调模型、检索、生图）→ L1 包，无业务表语义
 ├─ Agent 输出如何落库 → studio-agents Applier
 ├─ 多步骤流程（生成→改写→配图）→ studio-workflows
 └─ 用户交互 / 审批 / 对话 → studio-butler 或 apps
```

## 包依赖方向

```
apps → studio-butler / studio-workflows / content-center
studio-workflows → studio-agents / ai-runtime / db / image-provider
studio-agents → ai-runtime / db / image-provider
ai-runtime → ima-provider / image-provider / account-profile / db
ima-provider → db / core
image-provider → adapter 包（无 db）
```

## 工作流节点框架（`@acs/studio-workflows`）

业务流水线由 **节点执行框架 + JSON 定义 + 节点实现** 三部分组成：

| 组件     | 路径                 | 职责                                                                   |
| -------- | -------------------- | ---------------------------------------------------------------------- |
| 框架     | `src/engine/`        | `NodeRegistry`、`executeWorkflow`、条件 `when`、循环 `foreach`         |
| 节点     | `src/nodes/`         | 各原子能力薄包装（`agent.run`、`knowledge.search`、`image.covers` 等） |
| 流程定义 | `definitions/*.json` | 内置工作流步骤编排，改流程优先改 JSON                                  |

### 内置节点

| 节点 id              | 说明               |
| -------------------- | ------------------ |
| `content.setStatus`  | 更新内容状态       |
| `agent.run`          | 执行指定类型 Agent |
| `knowledge.search`   | 本地知识库检索     |
| `version.ensure`     | 确保平台版本存在   |
| `version.renderHtml` | 渲染平台正文 HTML  |
| `image.detectSlots`  | 检测正文插图 slot  |
| `image.bodySlots`    | 批量生成正文配图   |
| `image.covers`       | 生成各平台封面     |

### 内置工作流 JSON

- `definitions/content.generate.json` — 一键生成（BODY → REWRITE → 配图 → 封面）

### 扩展方式

1. 在 `src/nodes/` 实现新节点 handler
2. 在 `registerBuiltinNodes` 注册
3. 新建 `definitions/xxx.json` 编排步骤
4. 调用 `runWorkflow('xxx', { contentId, ... })`

## 后续演进（P3+）

- Parser、`defaultAgentSpecs` 外置到 `studio-agents` 或配置
- Context Provider 的 Prisma 读操作抽 Repository 接口
- `ai-runtime` 可考虑重命名为 `agent-kernel`（仅包名，行为不变）
- 工作流 JSON 支持 UI 可视化编辑与版本管理
