# 前端页面 ↔ API 映射表 V1

> 对照 `apps/web` 路由与 [`openapi.yaml`](./openapi.yaml)。  
> 更新日期：2026-06-06

## 图例

| 后端状态 | 含义 |
| -------- | ---- |
| ✅ implemented | 后端已实现，可联调 |
| 🟡 partial | 后端部分实现或字段不全 |
| 📋 planned | 文档已定义，后端未实现 |
| ⏭ mock-only | 前端 mock 区块，MVP 不对接（P3） |

| 前端状态 | 含义 |
| -------- | ---- |
| ✅ wired | 已调用 API |
| 🟡 partial | 部分区域接 API |
| ❌ mock | 全页或主要区域为静态 mock |

---

## 一、Sidebar 页面总览

| 路由 | 页面 | 后端状态 | 前端状态 | 优先级 |
| ---- | ---- | -------- | -------- | ------ |
| `/dashboard` | 工作台 | 🟡 partial | 🟡 partial | P0 |
| `/contents` | 内容项目 | ✅ | 🟡 partial | P0 |
| `/reviews` | 审核中心 | ✅ | 🟡 partial | P0 |
| `/agent-tasks` | Agent 任务 | ✅ | ❌ mock | P0 |
| `/accounts` | 平台账号 | 🟡 partial | 🟡 partial | P1 |
| `/settings/ima` | 知识库配置 | ✅ | ✅ wired | — |
| `/materials` | 素材库 | 📋 planned | ❌ mock | P1 |
| `/publishing` | 发布管理 | ✅ | ❌ mock | P0 |
| `/analytics` | 数据复盘 | 🟡 partial | ❌ mock | P0 |
| `/settings` | 系统设置（外部 Agent） | 📋 planned | ❌ mock | P1 |

---

## 二、按页面详细映射

### 1. `/dashboard` 工作台

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 顶部统计卡片 | `GET /dashboard/stats` | ✅ | ✅ | 6 个计数字段 |
| 工作流 Kanban | `GET /dashboard/stats` | ✅ | ✅ | 映射到 Kanban 列 |
| 最近内容列表 | `GET /contents?pageSize=50` | ✅ | ✅ | — |
| 指标环比 delta | — | — | ❌ mock | `pseudoDelta()` 伪随机 |
| 右侧告警栏 | `GET /dashboard/stats` → `alerts[]` | 📋 V1.1 | ❌ mock | 静态 `DashboardAlertRail` |

### 2. `/contents` 内容项目列表

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 列表 | `GET /contents` | ✅ | ✅ | — |
| 关键词搜索 | `GET /contents?keyword=` | 📋 | ❌ | UI 有输入框未传参 |
| 新建内容 | `POST /contents` | ✅ | ❌ | 按钮未接线 |
| 行内详情 | `GET /contents/:id` | ✅ | ✅ | 跳转详情页 |

### 3. `/contents/[id]` 内容详情

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 详情加载 | `GET /contents/:id` | ✅ | ✅ | 含 versions/materials/agentRuns |
| 保存标题/正文 | `PATCH /contents/:id` | ✅ | ❌ | 编辑 UI 未保存 |
| 版本编辑 | `PATCH /versions/:versionId` | ✅ | ❌ | — |
| IMA 搜索 | `POST /ima/search` | ✅ | 🟡 | 入口可加强 |
| 一键生成 | `POST /contents/:id/generate` | ✅ | 🟡 | — |
| Agent 运行 | `POST /agents/title\|rewrite\|review/run` | ✅ | ✅ | BODY 缺 `body/run` |
| Agent 记录 | `GET /agent-runs?contentId=` | ✅ | ✅ | — |
| 提交审核 | `POST /reviews` | ✅ | ✅ | — |
| 素材列表 | `GET /contents/:id/materials` | ✅ | ✅ | 旧模型 |
| 添加素材 | `POST /contents/:id/materials` | ✅ | ✅ | 迁移后可传 `assetId` |
| 删除素材 | `DELETE /materials/:id` | ✅ | ✅ | — |

### 4. `/reviews` 审核中心

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| Tab 待审/通过/驳回 | `GET /reviews?status=` | ✅ | ❌ | 仅查 PENDING |
| 汇总统计 | `GET /reviews/stats` | 📋 | ❌ mock | 静态数字 |
| 分布图表 | — | — | ❌ mock | — |
| 审核列表 | `GET /reviews?status=PENDING` | ✅ | ✅ | — |
| 通过/驳回 | `POST /reviews/:id/approve\|reject` | ✅ | ✅ | 驳回 comment UI 可加强 |

### 5. `/reviews/[id]` 审核详情

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 详情 | `GET /reviews/:id` | ✅ | ✅ | — |
| 通过/驳回 | `POST /reviews/:id/approve\|reject` | ✅ | ✅ | — |
| 审核清单 | — | — | ❌ mock | 静态 UI 项 |

### 6. `/agent-tasks` Agent 任务中心

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 任务列表 | `GET /agent-runs` | ✅ | ❌ mock | P0 接线即可 |
| 筛选/分页 | `GET /agent-runs?agentType&page` | 📋 V1.1 | ❌ mock | — |
| 统计卡片 | `GET /agent-runs` 聚合 | 🟡 | ❌ mock | 可前端计算 |

### 7. `/agent-tasks/[id]` Agent 任务详情

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 详情 | `GET /agent-runs/:id` | ✅ | ❌ mock | P0 接线 |
| 输入/输出 JSON | 同上 `input`/`output` | ✅ | ❌ mock | — |
| 重试/取消 | — | 📋 | ❌ mock | 后续迭代 |

### 8. `/accounts` 平台账号

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 列表 | `GET /accounts` | ✅ | 🟡 | 初始 fallback mock |
| 新建账号 | `POST /accounts` | 📋 | ❌ | 对话框 TODO |
| 同步 | `POST /accounts/sync` | ✅ | ❌ | — |
| 卡片扩展字段 | — | — | ❌ mock | agent数/发布数硬编码 |

### 9. `/accounts/[id]` 账号画像

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 账号信息 | `GET /accounts/:id` | ✅ | ✅ | — |
| 画像 | `GET /account-profiles?accountId=` | ✅ | ✅ | — |
| 保存画像 | `PUT /account-profiles/:accountId` | ✅ | ✅ | — |
| 知识库绑定 Tab | — | 📋 | ❌ mock | 占位文案 |

### 10. `/settings/ima` 知识库配置

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| IMA 配置 | `GET/PUT /ima/config` | ✅ | ✅ | — |
| 知识库列表 | `GET /ima/knowledge-bases` | ✅ | ✅ | — |
| 同步 | `POST /ima/knowledge-bases/sync` | ✅ | ✅ | — |
| 启用/默认 | `PATCH /ima/knowledge-bases/:id` | ✅ | ✅ | — |

### 11. `/knowledge` / `/knowledge/[id]` 知识库浏览

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 列表 | `GET /ima/knowledge-bases` | ✅ | ✅ | 非 sidebar 入口 |
| 详情 | 列表 client-side find | 🟡 | 🟡 | 缺 `GET /ima/knowledge-bases/:id` |
| 新建/编辑 | — | 📋 | ❌ | — |

### 12. `/materials` 素材库

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 统计卡片 | `GET /materials/library/stats` | 📋 | ❌ mock | — |
| 类型 Tab 列表 | `GET /materials/library?type=` | 📋 | ❌ mock | — |
| 上传 | `POST /materials/library/upload` | 📋 | ❌ mock | multipart MVP |
| 登记元数据 | `POST /materials/library` | 📋 | ❌ mock | — |
| 编辑/删除 | `PATCH/DELETE /materials/library/:id` | 📋 | ❌ mock | — |

### 13. `/publishing` 发布管理

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 顶部统计卡 | `GET /publishing/summary` | 📋 | ❌ mock | MVP 可先前端聚合 tasks |
| 待发布列表 | `GET /publishing/tasks?status=PENDING` | ✅ | ❌ mock | P0 |
| 创建任务 | `POST /publishing/tasks` | ✅ | ❌ mock | — |
| 立即发布 | `POST /publishing/tasks/:id/publish` | ✅ | ❌ mock | — |
| 取消 | `POST /publishing/tasks/:id/cancel` | ✅ | ❌ mock | — |
| 公众号草稿同步 | — | ⏭ P3 | ❌ mock | TurboPush 扩展 |
| 小红书/抖音发布包 | — | ⏭ P3 | ❌ mock | TurboPush 扩展 |

### 14. `/analytics` 数据复盘

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| 指标卡片 | `GET /analytics/overview` | 📋 | ❌ mock | P1；或前端聚合 |
| TOP 内容榜 | `GET /analytics/overview` | 📋 | ❌ mock | — |
| 内容指标 | `GET /analytics/contents/:contentId` | ✅ | ❌ mock | P0 |
| 同步数据 | `POST /analytics/sync` | ✅ | ❌ mock | — |
| 报告列表 | `GET /analytics/reports` | ✅ | ❌ mock | P0 |
| 生成报告 | `POST /analytics/reports/generate` | ✅ | ❌ mock | — |
| 报告详情 | `GET /analytics/reports/:id` | ✅ | ❌ mock | — |

### 15. `/settings` 系统设置（外部 Agent 接入）

| 区域 | API | 后端 | 前端 | 备注 |
| ---- | --- | ---- | ---- | ---- |
| API Key 列表 | `GET /integration/api-keys` | 📋 P1 | ❌ mock | — |
| 创建 Key | `POST /integration/api-keys` | 📋 P1 | ❌ mock | — |
| 启用/删除 Key | `PATCH/DELETE /integration/api-keys/:id` | 📋 P1 | ❌ mock | — |
| 回调配置 | `GET/PUT /integration/webhooks` | 📋 P1 | ❌ mock | — |
| 接入日志 | `GET /integration/access-logs` | 📋 P1 | ❌ mock | — |
| 接口状态 | `GET /integration/status` | 📋 P1 | ❌ mock | — |

### 16. 隐藏/辅助路由

| 路由 | 页面 | 主要 API | 后端 | 前端 |
| ---- | ---- | -------- | ---- | ---- |
| `/login` | 登录 | `POST /auth/login` | ✅ | ✅ |
| `/` | 重定向 | — | — | ✅ |
| `/topics` | 选题管理 | `/topics` CRUD | ✅ | ✅ |
| `/prompts` | Prompt 中心 | `GET /prompts` | ✅ | 🟡 只读 |
| `/ai-generate` | AI 生成工作台 | `/agents/*/run`, `/ima/search` | 🟡 | ❌ mock |
| 全局顶栏 | 用户信息 | `GET /auth/me` | ✅ | ✅ |

---

## 三、实现优先级

### P0 — 前端接线已有 API（几乎不改后端）

- [ ] `/agent-tasks` → `GET /agent-runs`, `GET /agent-runs/:id`
- [ ] `/publishing` → `/publishing/tasks/*`
- [ ] `/analytics` → `/analytics/reports`, `/analytics/contents/:id`, `/analytics/sync`
- [ ] `/reviews` Tab → `GET /reviews?status=`
- [ ] `/contents/[id]` → `PATCH /contents/:id`, `PATCH /versions/:versionId`

### P1 — 新后端 + 前端

- [ ] 独立素材库 `/materials/library/*`
- [ ] 外部 Agent 接入 `/integration/*`
- [ ] `POST /accounts`, `POST /agents/body/run`
- [ ] `GET /reviews/stats`, `GET /publishing/summary`, `GET /analytics/overview`

### P2 — 系统管理

- [ ] `/settings` + `/users` 模块
- [ ] Dashboard `alerts[]`, `publishedWeek`

### P3 — TurboPush 扩展

- [ ] 发布页草稿同步、发布包
- [ ] 真实 TurboPush / IMA / DeepSeek 接入

---

## 四、相关文档

- [API 设计文档 V1](./API设计文档 V1.md)
- [OpenAPI](./openapi.yaml)
- [模块缺口清单 V1](./模块缺口清单%20V1.md)
- [页面原型文档 V1](./页面原型文档%20V1.md)
