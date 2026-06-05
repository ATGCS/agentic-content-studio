# API 设计文档 V1

## 一、概述

- **Base URL**：`/api`
- **协议**：HTTPS（生产）/ HTTP（本地）
- **格式**：JSON，`Content-Type: application/json`
- **OpenAPI**：见同目录 [`openapi.yaml`](./openapi.yaml)
- **鉴权**：JWT，见《权限模型 V1》

## 二、统一响应格式

### 成功

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 失败

```json
{
  "code": 40001,
  "message": "content not found",
  "data": null
}
```

### 常见 HTTP 状态

| HTTP | code 示例 | 说明 |
| ---- | --------- | ---- |
| 200 | 0 | 成功 |
| 400 | 400xx | 参数错误 |
| 401 | 40100 | 未登录 |
| 403 | 40300 | 无权限 |
| 404 | 404xx | 资源不存在 |
| 500 | 50000 | 服务错误 |

### 分页列表

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

查询参数：`page`（默认 1）、`pageSize`（默认 20，最大 100）、`sort`（如 `-createdAt`）。

## 三、模块与路由总览

| 模块 | 前缀 | 说明 |
| ---- | ---- | ---- |
| Auth | `/api/auth` | 登录、当前用户 |
| Users | `/api/users` | 用户管理（ADMIN） |
| Accounts | `/api/accounts` | 平台账号 |
| Account Profiles | `/api/account-profiles` | 账号画像 |
| Topics | `/api/topics` | 选题 |
| Contents | `/api/contents` | 内容项目 |
| Versions | `/api/versions` | 平台版本 |
| Agents | `/api/agents` | Agent 配置与执行 |
| Agent Runs | `/api/agent-runs` | 执行记录 |
| Prompts | `/api/prompts` | Prompt 模板 |
| IMA | `/api/ima` | IMA 搜索 |
| Reviews | `/api/reviews` | 审核 |
| Publishing | `/api/publishing` | 发布 |
| Analytics | `/api/analytics` | 数据与复盘 |
| Settings | `/api/settings` | 系统配置（ADMIN） |

## 四、Auth

| 方法 | 路径 | 角色 | 说明 |
| ---- | ---- | ---- | ---- |
| POST | `/auth/login` | 公开 | 邮箱+密码登录 |
| POST | `/auth/logout` | 已登录 | 注销 |
| GET | `/auth/me` | 已登录 | 当前用户信息 |

## 五、Users（ADMIN）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/users` | 用户列表 |
| POST | `/users` | 创建用户 |
| GET | `/users/:id` | 用户详情 |
| PATCH | `/users/:id` | 更新用户（含 role） |

## 六、Accounts

| 方法 | 路径 | 角色 | 说明 |
| ---- | ---- | ---- | ---- |
| GET | `/accounts` | 全部（按归属过滤） | 账号列表，`?platform=&authStatus=` |
| GET | `/accounts/:id` | 全部 | 账号详情 |
| POST | `/accounts/sync` | ADMIN, OPERATOR | 从 TurboPush 同步账号 |
| PATCH | `/accounts/:id` | ADMIN, OPERATOR | 更新本地扩展字段 |

## 七、Account Profiles

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/account-profiles?accountId=` | 按账号查画像 |
| PUT | `/account-profiles/:accountId` | 创建或更新画像 |

## 八、Topics

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/topics` | 列表，`?status=&ownerId=` |
| POST | `/topics` | 创建选题 |
| GET | `/topics/:id` | 详情 |
| PATCH | `/topics/:id` | 更新 |
| DELETE | `/topics/:id` | 删除（无关联内容时） |

**POST /topics 请求体**

```json
{
  "title": "AI内容运营平台选题",
  "description": "分析内容运营中台的产品机会",
  "targetPlatforms": ["WECHAT", "XIAOHONGSHU"],
  "source": "manual"
}
```

## 九、Contents

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/contents` | 列表，`?status=&topicId=` |
| POST | `/contents` | 创建内容项目 |
| GET | `/contents/:id` | 详情（含 versions 摘要） |
| PATCH | `/contents/:id` | 更新标题/正文/状态 |
| POST | `/contents/:id/generate` | 触发主内容生成（编排多个 Agent） |
| GET | `/contents/:id/versions` | 版本列表 |
| POST | `/contents/:id/versions/generate` | 批量生成平台版本 |

**POST /contents/:id/generate**

```json
{
  "accountId": "acc_001",
  "steps": ["ima_search", "title", "body", "rewrite"]
}
```

## 十、Versions

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/versions/:id` | 版本详情 |
| PATCH | `/versions/:id` | 人工编辑版本 |
| DELETE | `/versions/:id` | 删除草稿版本 |

## 十一、Agents & Prompts

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/prompts` | Prompt 列表 |
| POST | `/prompts` | 新建 Prompt（ADMIN） |
| PATCH | `/prompts/:id` | 更新 |
| GET | `/agents` | Agent 列表 |
| POST | `/agents/:id/run` | 按 Agent 配置执行 |
| POST | `/agents/title/run` | 标题 Agent 快捷入口 |
| POST | `/agents/rewrite/run` | 平台改写 Agent |
| POST | `/agents/review/run` | 审核辅助 Agent |
| GET | `/agent-runs` | 执行记录，`?contentId=&status=` |
| GET | `/agent-runs/:id` | 单条记录 |

## 十二、IMA

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/ima/search` | 搜索并写入 `ima_search_logs` |

```json
{
  "query": "小红书 AI 内容运营",
  "contentId": "content_001",
  "limit": 10
}
```

## 十三、Reviews

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/reviews` | 审核队列，`?status=PENDING` |
| POST | `/reviews` | 提交审核 |
| POST | `/reviews/:id/approve` | 通过 |
| POST | `/reviews/:id/reject` | 驳回 |

**POST /reviews/:id/reject**

```json
{
  "comment": "标题不符合账号风格"
}
```

## 十四、Publishing

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/publishing/tasks` | 发布任务列表 |
| POST | `/publishing/tasks` | 创建任务 |
| GET | `/publishing/tasks/:id` | 任务详情 |
| POST | `/publishing/tasks/:id/publish` | 调用 TurboPush 发布 |
| POST | `/publishing/tasks/:id/cancel` | 取消 |

**POST /publishing/tasks**

```json
{
  "versionId": "version_001",
  "accountId": "account_001",
  "scheduledAt": null
}
```

## 十五、Analytics

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/analytics/sync` | 同步单条发布数据 |
| GET | `/analytics/contents/:contentId` | 内容指标 |
| POST | `/analytics/reports/generate` | 生成复盘报告 |
| GET | `/analytics/reports/:id` | 报告详情 |
| GET | `/analytics/reports` | 报告列表 |

## 十六、Settings（ADMIN）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/settings` | 配置列表（脱敏） |
| PUT | `/settings/:key` | 更新配置 |

## 十七、与详细设计文档的关系

《基于 TurboPush 改造的 AI 内容运营中台详细设计文档 V1》第七章中的 HTTP 示例已并入本文档；**以本文档 + openapi.yaml 为实施标准**，详细设计文档仅保留业务流程说明。

## 十八、错误码分段（建议）

| 区间 | 模块 |
| ---- | ---- |
| 40001-40099 | 通用参数 |
| 40100-40199 | 认证 |
| 40300-40399 | 权限 |
| 40401-40499 | 内容/选题 |
| 40501-40599 | Agent |
| 40601-40699 | 审核 |
| 40701-40799 | 发布 |
| 40801-40899 | 数据分析 |
