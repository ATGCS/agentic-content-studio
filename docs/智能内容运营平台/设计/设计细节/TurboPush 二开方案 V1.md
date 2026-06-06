# TurboPush 二开方案 V1

## 一、原则

1. **不魔改 TurboPush 核心发布逻辑**，通过 `packages/turbopush-adapter` 封装调用。
2. **ID 对齐**：`platform_accounts.id` 与 TurboPush 账号 ID 保持一致，便于同步与升级合并。
3. **新增能力独立包**：内容资产、Agent、审核、复盘等放在 `packages/*`，减少与上游目录冲突。
4. **升级策略**：上游合并时，仅 touch `turbopush-adapter` 与明确标注「扩展点」的文件。

> **本仓库**：[ATGCS/agentic-content-studio](https://github.com/ATGCS/agentic-content-studio)（Agentic Content Studio）。  
> TurboPush **官网**另库维护（如 `turbopush-website`）。下列为 Monorepo 根目录 `agentic-content-studio/` 规划；接入时需 clone TurboPush 源码并对照实际路径填写「上游路径」列。

## 二、模块处理总表

| 模块 | 处理方式 | 中台落点 | 说明 |
| ---- | -------- | -------- | ---- |
| 用户管理 | 直接复用 | TurboPush 登录 + 映射 `users` | 同步角色到中台 RBAC |
| 团队管理 | 直接复用 | 不改 | MVP 可不暴露团队 UI |
| 平台账号 | 复用 + 扩展 | `platform_accounts` + Adapter 同步 | 扩展字段放中台表或 `rawData` |
| 内容编辑器 | 复用（发布前） | 审核通过后调起 | 生成在中台，发布走 TurboPush |
| 发布中心 | 复用 | `PublishingTask` → Adapter.publish | 不重复实现各平台 SDK |
| 数据同步 | 复用 | `AnalyticsData` ← Adapter.syncMetrics | 定时或手动同步 |
| 平台适配器 | 复用 | 封装在 `turbopush-adapter` | 隔离上游变更 |
| 内容资产 | 新增 | `packages/content-center` | topics / contents / versions |
| 多平台版本 | 新增 | `content_versions` | 生成在中台，发布时推送 |
| 账号画像 | 新增 | `packages/account-profile` | TurboPush 不管运营策略 |
| Agent Runtime | 新增 | `packages/ai-runtime` | 完全自研 |
| Prompt 中心 | 新增 | `prompts` / `agents` 表 + UI | |
| 审核中心 | 新增 | `packages/review-center` | 状态机在中台 |
| IMA 搜索 | 新增 | `packages/ima-provider` | 外部 API |
| 数据复盘 | 新增 | `packages/analytics-center` | 报告 + 指标 |

## 三、目标 Monorepo 结构

```text
agentic-content-studio/
├── apps/
│   ├── web/                 # Next.js 中台前端（可 fork TurboPush Web 或新建）
│   └── api/                 # 中台 API
├── packages/
│   ├── db/                  # Prisma
│   ├── core/                # 枚举、类型、工具
│   ├── turbopush-adapter/   # 唯一允许直接 import TurboPush 内部模块的包
│   ├── ai-runtime/
│   ├── ima-provider/
│   ├── content-center/
│   ├── review-center/
│   ├── analytics-center/
│   └── account-profile/
└── vendor/
    └── turbopush/           # git submodule 或 npm 依赖指向 TurboPush
```

## 四、Adapter 接口（与详细设计一致）

```ts
// packages/turbopush-adapter/src/publish-provider.ts
export interface PublishProvider {
  listAccounts(): Promise<PlatformAccountDTO[]>
  publish(input: PublishInput): Promise<PublishResult>
  syncMetrics(input: SyncMetricsInput): Promise<MetricsResult>
}
```

| 方法 | TurboPush 能力映射 | 中台调用方 |
| ---- | ------------------ | ---------- |
| listAccounts | 原账号列表 API | POST /accounts/sync |
| publish | 原发布流程 | POST /publishing/tasks/:id/publish |
| syncMetrics | 原数据同步 | POST /analytics/sync |

## 五、数据同步策略

| 数据 | 方向 | 频率 |
| ---- | ---- | ---- |
| 平台账号 | TurboPush → 中台 | 登录后 + 每日 + 手动 |
| 发布结果 | TurboPush → 中台 `publish_records` | 发布回调后 |
| 内容正文 | 中台 → TurboPush | 发布瞬间推送 | 不双向编辑冲突 |
| 指标 | TurboPush → 中台 `analytics_data` | 发布后 T+1 / 手动 |

冲突规则：**生成与编辑以中台为准**；**发布态与平台 postId 以 TurboPush 为准**。

## 六、扩展点清单（允许改动的上游位置）

实施时对照 TurboPush 仓库填写具体路径：

| 扩展点 | 建议做法 |
| ------ | -------- |
| 路由注册 | 增加菜单项指向中台页面或 iframe |
| 账号详情页 | 增加「画像」Tab，链接中台 `/account-profiles` |
| 发布前钩子 | 校验中台 `version.status === APPROVED`（HTTP 调中台 API） |
| 环境变量 | 增加 `AI_OPS_API_URL` |

**禁止**：直接在中台库修改 TurboPush 的 `node_modules`；禁止复制粘贴发布 SDK 到中台多处。

## 七、升级 TurboPush 流程

1. 在 `vendor/turbopush` 拉取上游 tag
2. 跑 Adapter 集成测试（账号列表、mock 发布、mock 指标）
3. 检查扩展点 diff，人工合并菜单/钩子
4. 不合并中台 `packages/content-center` 等目录

## 八、第一阶段不做的 TurboPush 能力

- 替换 TurboPush 登录体系
- 在中台重写各平台 OAuth
- 双写两套内容主表

## 九、待办（落地前必须完成）

| 项 | 负责人 | 状态 |
| --- | --- | --- |
| 确认 TurboPush 源码仓库地址与版本 tag | | □ |
| 填写「上游路径」列（账号/发布/同步模块真实路径） | | □ |
| Adapter 集成测试用例 | | □ |
| 账号 ID 映射联调 | | □ |

相关文档：《权限模型 V1》《数据库设计文档 V1》《Agent Runtime 设计文档 V1》
