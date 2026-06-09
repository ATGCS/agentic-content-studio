# API 设计文档 V1

## 一、概述

- **Base URL**：`/api`
- **本地 API**：`http://localhost:3001/api`
- **协议**：HTTPS（生产）/ HTTP（本地）
- **格式**：JSON，`Content-Type: application/json`
- **OpenAPI**：见同目录 [`openapi.yaml`](./openapi.yaml)
- **鉴权**：JWT Bearer Token，登录接口除外

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

| HTTP | code 示例 | 说明                |
| ---- | --------- | ------------------- |
| 200  | 0         | 成功                |
| 400  | 400xx     | 参数错误            |
| 401  | 40100     | 未登录或 token 无效 |
| 403  | 40300     | 无权限              |
| 404  | 404xx     | 资源不存在          |
| 500  | 50000     | 服务错误            |

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

通用查询参数：

| 参数     | 类型   | 必填 | 说明                            |
| -------- | ------ | ---- | ------------------------------- |
| page     | number | 否   | 页码，默认 1                    |
| pageSize | number | 否   | 每页数量，默认 20，最大建议 100 |
| sort     | string | 否   | 排序，如 `-createdAt`           |

## 三、枚举

### UserRole

```text
ADMIN / OPERATOR / REVIEWER / ANALYST
```

### Platform

```text
WECHAT / XIAOHONGSHU / DOUYIN / VIDEO_CHANNEL / BILIBILI / ZHIHU / OTHER
```

### ContentStatus

```text
DRAFT / PENDING_GENERATE / GENERATING / PENDING_REVIEW / REJECTED / APPROVED / PENDING_PUBLISH / PUBLISHING / PUBLISHED / FAILED / REVIEWED / ARCHIVED
```

### AgentType

```text
TITLE / TAG / REWRITE / BODY / COVER_COPY / REVIEW / SUMMARY / TOPIC / IMAGE / VIDEO_SCRIPT / COMPETITOR
```

### RunStatus

```text
PENDING / RUNNING / SUCCESS / FAILED
```

### ReviewStatus

```text
PENDING / APPROVED / REJECTED
```

### PublishStatus

```text
PENDING / PUBLISHING / SUCCESS / FAILED / CANCELLED
```

### MaterialType / MaterialRole

```text
MaterialType: IMAGE / VIDEO / AUDIO / FILE
MaterialRole: COVER / BODY / ATTACHMENT
```

## 四、模块与路由总览

| 模块              | 路径                      | 状态      | 说明                                         |
| ----------------- | ------------------------- | --------- | -------------------------------------------- |
| Auth              | `/auth/*`                 | 已实现    | 登录、当前用户                               |
| Dashboard         | `/dashboard/stats`        | 已实现    | 工作台统计                                   |
| Accounts          | `/accounts/*`             | 已实现    | 平台账号                                     |
| Account Profiles  | `/account-profiles/*`     | 已实现    | 账号画像                                     |
| Topics            | `/topics/*`               | 已实现    | 选题                                         |
| Contents          | `/contents/*`             | 已实现    | 内容项目                                     |
| Content Materials | `/contents/:id/materials` | 已实现    | 内容素材绑定                                 |
| Versions          | `/versions/*`             | 已实现    | 平台版本详情与编辑                           |
| Materials         | `/materials/*`            | 已实现    | 内容绑定素材（旧模型）                       |
| Material Library  | `/materials/library/*`    | 规划中 P1 | 独立素材库                                   |
| IMA               | `/ima/*`                  | 已实现    | IMA 配置、知识库、检索                       |
| Agents            | `/agents/*`               | 部分实现  | Agent 配置与执行；`body/run` 规划中          |
| Agent Runs        | `/agent-runs/*`           | 已实现    | Agent 执行记录                               |
| Prompts           | `/prompts/*`              | 已实现    | Prompt 模板                                  |
| Reviews           | `/reviews/*`              | 已实现    | 审核；`/reviews/stats` 规划中                |
| Publishing        | `/publishing/*`           | 已实现    | 发布任务；`/publishing/summary` 规划中       |
| Analytics         | `/analytics/*`            | 部分实现  | 数据同步与复盘；`/analytics/overview` 规划中 |
| Integration       | `/integration/*`          | 规划中 P1 | 外部 Agent 接入                              |
| Users             | `/users/*`                | 规划中 P2 | 用户管理                                     |
| Settings          | `/settings/*`             | 规划中 P2 | 系统配置（模型/TurboPush 等）                |

## 五、Auth

### POST /auth/login

公开接口，邮箱密码登录。

请求体：

| 字段     | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| email    | string | 是   | 登录邮箱 |
| password | string | 是   | 登录密码 |

请求示例：

```json
{
  "email": "admin@acs.local",
  "password": "admin123"
}
```

响应 `data`：

| 字段  | 类型       | 说明     |
| ----- | ---------- | -------- |
| token | string     | JWT      |
| user  | UserPublic | 当前用户 |

响应示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user_001",
      "email": "admin@acs.local",
      "name": "管理员",
      "role": "ADMIN"
    }
  }
}
```

### GET /auth/me

返回当前登录用户。

响应 `data`：`UserPublic`

### POST /auth/logout

状态：规划中。当前前端可直接清除本地 token 完成退出。

## 六、Dashboard

### GET /dashboard/stats

工作台统计。**V1 已实现**扁平计数结构：

| 字段            | 类型   | 说明                                 |
| --------------- | ------ | ------------------------------------ |
| pendingGenerate | number | 待生成（DRAFT + PENDING_GENERATE）   |
| generating      | number | 生成中                               |
| pendingReview   | number | 待审核                               |
| pendingPublish  | number | 待发布（APPROVED + PENDING_PUBLISH） |
| publishedTotal  | number | 已发布（PUBLISHED + PUBLISHING）     |
| reviewed        | number | 已审核通过                           |

**V1.1 规划**字段：

| 字段          | 类型   | 说明                                     |
| ------------- | ------ | ---------------------------------------- |
| publishedWeek | number | 本周已发布                               |
| alerts        | array  | 工作台右侧告警（risk / agent / account） |

响应示例（V1）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pendingGenerate": 12,
    "generating": 2,
    "pendingReview": 5,
    "pendingPublish": 8,
    "publishedTotal": 26,
    "reviewed": 3
  }
}
```

## 七、Accounts

### GET /accounts

账号列表。

Query：

| 字段       | 类型     | 必填 | 说明         |
| ---------- | -------- | ---- | ------------ |
| platform   | Platform | 否   | 平台筛选     |
| authStatus | string   | 否   | 授权状态筛选 |

响应 `data`：`PlatformAccount[]`

`PlatformAccount` 字段：

| 字段        | 类型     | 说明         |
| ----------- | -------- | ------------ |
| id          | string   | 账号 ID      |
| platform    | Platform | 平台         |
| accountName | string   | 账号名称     |
| accountType | string?  | 账号类型     |
| authStatus  | string   | 授权状态     |
| ownerId     | string   | 负责人 ID    |
| rawData     | object?  | 平台原始数据 |
| createdAt   | string   | 创建时间     |
| updatedAt   | string   | 更新时间     |

### GET /accounts/:id

账号详情。

Path：

| 字段 | 类型   | 必填 | 说明    |
| ---- | ------ | ---- | ------- |
| id   | string | 是   | 账号 ID |

响应 `data`：`PlatformAccount`，可包含 `profile` 等关联信息。

### POST /accounts/sync

从 TurboPush 同步账号。角色：`ADMIN`、`OPERATOR`。

响应 `data`：

```json
{
  "synced": 12
}
```

### POST /accounts

状态：**规划中 P1**。手动创建平台账号（前端「新建账号」对话框）。

请求体：

| 字段        | 类型     | 必填 | 说明                    |
| ----------- | -------- | ---- | ----------------------- |
| platform    | Platform | 是   | 平台                    |
| accountName | string   | 是   | 账号名称                |
| accountType | string   | 否   | 账号类型                |
| ownerId     | string   | 否   | 负责人 ID，默认当前用户 |

响应 `data`：`PlatformAccount`

### PATCH /accounts/:id

更新账号。角色：`ADMIN`、`OPERATOR`。

请求体：

| 字段        | 类型     | 必填 | 说明         |
| ----------- | -------- | ---- | ------------ |
| platform    | Platform | 否   | 平台         |
| accountName | string   | 否   | 账号名称     |
| accountType | string   | 否   | 账号类型     |
| authStatus  | string   | 否   | 授权状态     |
| ownerId     | string   | 否   | 负责人 ID    |
| rawData     | object   | 否   | 平台原始数据 |

响应 `data`：`PlatformAccount`

## 八、Account Profiles

### GET /account-profiles?accountId=

按账号查询画像。

Query：

| 字段      | 类型   | 必填 | 说明    |
| --------- | ------ | ---- | ------- |
| accountId | string | 是   | 账号 ID |

响应 `data`：`AccountProfile | null`

### PUT /account-profiles/:accountId

创建或更新账号画像。

Path：

| 字段      | 类型   | 必填 | 说明    |
| --------- | ------ | ---- | ------- |
| accountId | string | 是   | 账号 ID |

请求体：

| 字段            | 类型   | 必填 | 说明     |
| --------------- | ------ | ---- | -------- |
| positioning     | string | 否   | 账号定位 |
| targetAudience  | object | 否   | 目标人群 |
| contentStyle    | string | 否   | 内容风格 |
| titlePreference | string | 否   | 标题偏好 |
| coverPreference | string | 否   | 封面偏好 |
| tone            | string | 否   | 语气     |
| forbiddenWords  | array  | 否   | 禁用词   |
| contentBoundary | string | 否   | 内容边界 |
| publishStrategy | string | 否   | 发布策略 |

响应 `data`：`AccountProfile`

## 九、Topics

### GET /topics

选题列表。

Query：

| 字段     | 类型          | 必填 | 说明     |
| -------- | ------------- | ---- | -------- |
| status   | ContentStatus | 否   | 状态     |
| ownerId  | string        | 否   | 负责人   |
| page     | number        | 否   | 页码     |
| pageSize | number        | 否   | 每页数量 |

响应 `data`：分页列表或 `Topic[]`，以服务实现为准。

### POST /topics

创建选题。

请求体：

| 字段            | 类型       | 必填 | 说明                |
| --------------- | ---------- | ---- | ------------------- |
| title           | string     | 是   | 选题标题            |
| description     | string     | 否   | 选题说明            |
| targetPlatforms | Platform[] | 否   | 目标平台            |
| source          | string     | 否   | 来源，默认 `manual` |

响应 `data`：`Topic`

### GET /topics/:id

选题详情。响应 `data`：`Topic`。

### PATCH /topics/:id

更新选题。请求体为 `Topic` 可更新字段。

### DELETE /topics/:id

删除选题。响应 `data`：`null`。

## 十、Contents

### GET /contents

内容项目列表。

Query：

| 字段    | 类型          | 必填 | 说明     |
| ------- | ------------- | ---- | -------- |
| status  | ContentStatus | 否   | 内容状态 |
| topicId | string        | 否   | 选题 ID  |

响应 `data`：`Content[]` 或分页列表。

### POST /contents

创建内容项目。

请求体：

| 字段    | 类型   | 必填 | 说明     |
| ------- | ------ | ---- | -------- |
| title   | string | 是   | 内容标题 |
| topicId | string | 否   | 关联选题 |
| summary | string | 否   | 内容摘要 |

响应 `data`：`Content`

### GET /contents/:id

内容详情。响应 `data`：`Content`，可包含 `versions` 摘要。

### PATCH /contents/:id

更新内容项目。

可更新字段：`title`、`summary`、`body`、`coverText`、`status` 等。

### POST /contents/:id/generate

编排生成主内容或多平台版本。

请求体：

| 字段      | 类型       | 必填 | 说明                             |
| --------- | ---------- | ---- | -------------------------------- |
| accountId | string     | 否   | 目标账号                         |
| platforms | Platform[] | 否   | 目标平台，默认 `['XIAOHONGSHU']` |

响应 `data`：

```json
{
  "versions": []
}
```

### GET /contents/:id/versions

内容的平台版本列表。响应 `data`：`ContentVersion[]`。

### POST /contents/:id/versions/generate

批量生成平台版本。

请求体：

| 字段       | 类型       | 必填 | 说明             |
| ---------- | ---------- | ---- | ---------------- |
| platforms  | Platform[] | 是   | 目标平台         |
| accountIds | string[]   | 否   | 目标账号 ID 列表 |

响应 `data`：`ContentVersion[]`

## 十一、Versions

### GET /versions/:versionId

平台版本详情。

响应 `data`：`ContentVersion`，包含 `content`、`account`、`reviewTasks`、`publishingTasks`、`analyticsData`。

### PATCH /versions/:versionId

人工编辑平台版本。

可更新字段：

| 字段         | 类型          | 说明         |
| ------------ | ------------- | ------------ |
| title        | string        | 平台版本标题 |
| body         | string        | 正文         |
| coverText    | string        | 封面文案     |
| tags         | array         | 标签         |
| formatConfig | object        | 平台格式配置 |
| status       | ContentStatus | 状态         |
| accountId    | string        | 目标账号     |

响应 `data`：`ContentVersion`

### DELETE /versions/:versionId

状态：规划中。删除语义涉及审核/发布关联，当前后端未实现。

## 十二、Materials（内容绑定素材）

> 现有实现：素材绑定到内容项目。独立素材库见 **§十八**。

### GET /materials

素材列表。

Query：支持按 `type`、`role`、`contentId` 等业务字段筛选。

响应 `data`：`Material[]`

### GET /materials/:id

素材详情。响应 `data`：`Material`。

### PATCH /materials/:id

更新素材。

请求体：

| 字段      | 类型         | 必填 | 说明     |
| --------- | ------------ | ---- | -------- |
| type      | MaterialType | 否   | 素材类型 |
| role      | MaterialRole | 否   | 素材用途 |
| name      | string       | 否   | 名称     |
| url       | string       | 否   | 远程地址 |
| localPath | string       | 否   | 本地路径 |
| source    | string       | 否   | 来源     |
| meta      | object       | 否   | 扩展信息 |

### DELETE /materials/:id

删除素材。响应 `data`：`{ "deleted": true }`

### GET /contents/:id/materials

查询内容项目绑定素材。响应 `data`：`Material[]`

### POST /contents/:id/materials

给内容项目新增素材。请求体同 `PATCH /materials/:id`，但 `type` 必填。

## 十三、IMA / Knowledge Bases

### GET /ima/config

获取 IMA 配置，敏感字段脱敏。

响应 `data`：

| 字段      | 类型    | 说明           |
| --------- | ------- | -------------- |
| clientId  | string? | 客户端 ID      |
| baseUrl   | string? | 服务地址       |
| useMock   | boolean | 是否 mock      |
| hasApiKey | boolean | 是否已配置密钥 |

### PUT /ima/config

更新 IMA 配置。角色：`ADMIN`。

请求体：

| 字段     | 类型    | 必填 | 说明                    |
| -------- | ------- | ---- | ----------------------- |
| clientId | string  | 否   | 客户端 ID               |
| apiKey   | string  | 否   | API Key，响应不明文返回 |
| baseUrl  | string  | 否   | 服务地址                |
| useMock  | boolean | 否   | 是否 mock               |

### GET /ima/knowledge-bases

知识库列表。

Query：

| 字段        | 类型    | 必填 | 说明             |
| ----------- | ------- | ---- | ---------------- |
| enabledOnly | boolean | 否   | 仅返回启用知识库 |

响应 `data`：`ImaKnowledgeBase[]`

### POST /ima/knowledge-bases/sync

从 IMA 同步知识库。角色：`ADMIN`、`OPERATOR`。

响应 `data`：

```json
{
  "synced": [],
  "count": 3
}
```

### PATCH /ima/knowledge-bases/:id

更新知识库本地配置。角色：`ADMIN`。

请求体：

| 字段      | 类型    | 必填 | 说明       |
| --------- | ------- | ---- | ---------- |
| enabled   | boolean | 否   | 是否启用   |
| isDefault | boolean | 否   | 是否默认   |
| name      | string  | 否   | 本地显示名 |

### POST /ima/search

检索知识库并写入日志。

请求体：

| 字段            | 类型   | 必填 | 说明        |
| --------------- | ------ | ---- | ----------- |
| query           | string | 是   | 搜索词      |
| contentId       | string | 是   | 内容项目 ID |
| limit           | number | 否   | 返回数量    |
| knowledgeBaseId | string | 否   | 指定知识库  |

响应 `data`：搜索结果，包含摘要和原始结果。

## 十四、Agents / Agent Runs / Prompts

### GET /agents

Agent 配置列表。响应 `data`：`Agent[]`，包含 `prompt`。

### POST /agents/title/run

运行标题 Agent。

请求体：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| contentId | string | 是   | 内容项目 ID |
| accountId | string | 否   | 账号 ID     |
| count     | number | 否   | 生成数量    |

响应 `data`：`AgentRun`

### POST /agents/rewrite/run

运行平台改写 Agent。

请求体：

| 字段      | 类型     | 必填 | 说明        |
| --------- | -------- | ---- | ----------- |
| contentId | string   | 是   | 内容项目 ID |
| platform  | Platform | 是   | 目标平台    |
| accountId | string   | 否   | 账号 ID     |

响应 `data`：`AgentRun`

### POST /agents/review/run

运行审核辅助 Agent。

请求体：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| versionId | string | 是   | 内容版本 ID |

响应 `data`：`AgentRun`

### POST /agents/body/run

状态：**规划中 P1**。运行正文 Agent。

请求体：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| contentId | string | 是   | 内容项目 ID |
| accountId | string | 否   | 账号 ID     |

响应 `data`：`AgentRun`

### GET /agent-runs

Agent 执行记录。

Query：

| 字段      | 类型      | 必填 | 说明                          |
| --------- | --------- | ---- | ----------------------------- |
| contentId | string    | 否   | 内容项目 ID                   |
| status    | RunStatus | 否   | 执行状态                      |
| agentType | AgentType | 否   | Agent 类型（V1.1 规划）       |
| platform  | Platform  | 否   | 平台（V1.1 规划）             |
| dateFrom  | string    | 否   | 起始时间 ISO8601（V1.1 规划） |
| dateTo    | string    | 否   | 结束时间 ISO8601（V1.1 规划） |
| page      | number    | 否   | 页码（V1.1 规划）             |
| pageSize  | number    | 否   | 每页数量（V1.1 规划）         |

响应 `data`：`AgentRun[]`，详情接口额外包含 `agent`（含 `prompt`）、`content`、`version`。

`AgentRun` 关联字段：

| 字段             | 类型      | 说明                      |
| ---------------- | --------- | ------------------------- |
| agent.type       | AgentType | Agent 类型                |
| content.title    | string    | 关联内容标题              |
| version.platform | Platform  | 关联平台版本              |
| durationMs       | number    | 执行耗时毫秒（V1.1 规划） |

### GET /agent-runs/:id

Agent 执行详情。

响应 `data`：`AgentRun`，包含 `agent.prompt`、`content`、`version`。

### GET /prompts

Prompt 列表。响应 `data`：`Prompt[]`

### POST /prompts

新建 Prompt。角色：`ADMIN`。

请求体：

| 字段      | 类型      | 必填 | 说明            |
| --------- | --------- | ---- | --------------- |
| name      | string    | 是   | Prompt 名称     |
| agentType | AgentType | 是   | Agent 类型      |
| template  | string    | 是   | 模板            |
| version   | string    | 否   | 版本，默认 `v1` |

### PATCH /prompts/:id

更新 Prompt。角色：`ADMIN`。

## 十五、Reviews

### GET /reviews

审核列表。

Query：支持 `status`、`contentId`、`reviewerId` 等筛选。

响应 `data`：`ReviewTask[]`

### GET /reviews/stats

状态：**规划中 P1**。审核中心 Tab 汇总。

响应 `data`：

```json
{
  "pending": 12,
  "approved": 45,
  "rejected": 3
}
```

### GET /reviews/:id

审核详情。

响应 `data`：`ReviewTask`，包含 `content.versions`、`version`、`reviewer`。

### POST /reviews

提交审核。

请求体：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| contentId | string | 是   | 内容项目 ID |
| versionId | string | 否   | 内容版本 ID |

响应 `data`：`ReviewTask`

### POST /reviews/:id/approve

审核通过。响应 `data`：`ReviewTask`

### POST /reviews/:id/reject

审核驳回。

请求体：

| 字段    | 类型   | 必填 | 说明     |
| ------- | ------ | ---- | -------- |
| comment | string | 否   | 驳回原因 |

响应 `data`：`ReviewTask`

## 十六、Publishing

### GET /publishing/tasks

发布任务列表。

Query：

| 字段   | 类型          | 必填 | 说明     |
| ------ | ------------- | ---- | -------- |
| status | PublishStatus | 否   | 发布状态 |

响应 `data`：`PublishingTask[]`

`PublishingTask` 详情可包含关联：`content`（标题）、`version`（平台版本）、`account`（账号名）、`publishRecord`（发布记录）。

### GET /publishing/summary

状态：**规划中 P1**。发布管理页顶部统计卡。

响应 `data`：

| 字段                | 类型   | 说明                                          |
| ------------------- | ------ | --------------------------------------------- |
| pendingCount        | number | 待发布任务数                                  |
| draftSyncCount      | number | 草稿同步数（P3 TurboPush 扩展，MVP 可返回 0） |
| packageRedCount     | number | 小红书发布包（P3，MVP 可返回 0）              |
| packageDouyinCount  | number | 抖音发布包（P3，MVP 可返回 0）                |
| publishedTodayCount | number | 今日已发布                                    |

### POST /publishing/tasks

创建发布任务。

请求体：

| 字段        | 类型           | 必填 | 说明                           |
| ----------- | -------------- | ---- | ------------------------------ |
| versionId   | string         | 是   | 内容版本 ID                    |
| accountId   | string         | 是   | 发布账号 ID                    |
| scheduledAt | string \| null | 否   | 定时发布时间，空表示立即或待定 |

响应 `data`：`PublishingTask`

### GET /publishing/tasks/:id

发布任务详情。响应 `data`：`PublishingTask`

### POST /publishing/tasks/:id/publish

执行发布，调用 TurboPush。响应 `data`：发布结果或 `PublishRecord`。

### POST /publishing/tasks/:id/cancel

取消发布任务。响应 `data`：`PublishingTask`

## 十七、Analytics

### POST /analytics/sync

同步单条发布数据。

请求体：

| 字段            | 类型   | 必填 | 说明        |
| --------------- | ------ | ---- | ----------- |
| publishRecordId | string | 是   | 发布记录 ID |

响应 `data`：`AnalyticsData`

### GET /analytics/contents/:contentId

内容项目数据指标。响应 `data`：内容维度指标集合。

### GET /analytics/overview

状态：**规划中 P1**。数据复盘页顶部指标与 TOP 内容榜。

Query：`platform`、`dateFrom`、`dateTo`

响应 `data`：聚合 `views/likes/comments/shares/collects` 及 `topContents[]`。

### POST /analytics/reports/generate

生成复盘报告。

请求体：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| contentId | string | 是   | 内容项目 ID |

响应 `data`：`AnalyticsReport`

### GET /analytics/reports/:id

复盘报告详情。响应 `data`：`AnalyticsReport`

### GET /analytics/reports

复盘报告列表。

Query：

| 字段      | 类型   | 必填 | 说明        |
| --------- | ------ | ---- | ----------- |
| contentId | string | 否   | 内容项目 ID |

响应 `data`：`AnalyticsReport[]`

响应 `data`：`AnalyticsReport[]`

## 十八、Material Library（独立素材库，P1 规划）

与 §十二 内容绑定素材并存。新模型：

- `MaterialAsset`：全局素材资产
- `ContentMaterialLink`：内容 ↔ 素材关联（`/contents/:id/materials` 逐步迁移）

### GET /materials/library

全局素材列表。

Query：`type`、`tag`、`keyword`、`status`、`page`、`pageSize`

响应 `data`：分页 `MaterialAsset[]`

`MaterialAsset` 字段：

| 字段       | 类型                           | 说明            |
| ---------- | ------------------------------ | --------------- |
| id         | string                         | 素材 ID         |
| name       | string                         | 显示名称        |
| fileName   | string                         | 文件名          |
| type       | MaterialType                   | 类型            |
| format     | string                         | 格式如 JPG、MP4 |
| sizeBytes  | number                         | 文件大小        |
| url        | string?                        | 访问地址        |
| tags       | string[]                       | 标签            |
| source     | string?                        | 来源            |
| uploaderId | string                         | 上传者          |
| uploader   | UserPublic                     | 上传者信息      |
| status     | ENABLED / REVIEWING / DISABLED | 状态            |
| createdAt  | string                         | 创建时间        |

### GET /materials/library/stats

统计卡片。响应 `data`：`{ total, byType: { IMAGE: n, ... } }`

### POST /materials/library

登记素材元数据（不上传文件时使用）。

### POST /materials/library/upload

**MVP 选型**：`multipart/form-data` 直传本地 `uploads/` 目录；生产环境可切换预签名 URL 二段式上传。

Form 字段：`file`（必填）、`name`、`tags`（逗号分隔）、`source`

### GET/PATCH/DELETE /materials/library/:id

素材详情、更新（name/tags/status/source）、删除。

### POST /contents/:id/materials（迁移后）

请求体优先使用 `assetId` 关联已有素材；仍支持内联 `url/localPath` 兼容旧流程。

## 十九、Integration（外部 Agent 接入，P1 规划）

对应前端 `/settings` 页（外部 Agent 接入 mock）。角色：`ADMIN`。

与 `/ima/config` 边界：IMA 管知识库提供方；Integration 管外部系统调用本平台的 API Key 与回调。

### GET/POST /integration/api-keys

列表 / 创建。创建响应含 `plainTextKey`（仅一次）及脱敏后的 `keyPrefix`。

### PATCH/DELETE /integration/api-keys/:id

启用/停用、更新名称描述、删除。

### GET/PUT /integration/webhooks

回调配置列表 / 批量更新（事件类型如 `agent.run.completed`、`publish.success`）。

### GET /integration/access-logs

接入日志，Query：`apiKeyId`、`page`、`pageSize`

### GET /integration/status

接口健康、限流、24h 请求量与错误率。

### External API 鉴权规范

外部 Agent 调用本平台开放接口时使用 Header：

```text
Authorization: Bearer <api-key>
```

或：

```text
X-API-Key: <api-key>
```

## 二十、Settings / Users（P2 规划）

对应原型 §10 系统设置（模型配置、TurboPush 连接、用户管理入口）。

与 IMA 配置分工：

| 配置项                      | 路径                                 |
| --------------------------- | ------------------------------------ |
| IMA 客户端/密钥/Mock        | `PUT /ima/config`                    |
| 默认 LLM 模型、DeepSeek Key | `PUT /settings/model.default`        |
| TurboPush 地址、同步开关    | `PUT /settings/turbopush.baseUrl` 等 |
| 功能开关                    | `PUT /settings/features.*`           |

### GET /settings

系统配置列表。响应 `data`：`SystemSetting[]`

### PUT /settings/:key

更新单项配置。请求体：`{ value: object }`

### GET/POST /users

用户列表 / 创建。角色：`ADMIN`

### GET/PATCH /users/:id

用户详情 / 更新角色、禁用状态。

### POST /auth/logout

可选；前端清除本地 token 即可完成退出。

## 二十一、规划中增强接口（联调辅助）

| 方法   | 路径                      | 状态 | 说明                       |
| ------ | ------------------------- | ---- | -------------------------- |
| POST   | `/agents/body/run`        | P1   | 正文 Agent                 |
| POST   | `/accounts`               | P1   | 手动创建账号               |
| GET    | `/reviews/stats`          | P1   | 审核 Tab 汇总              |
| GET    | `/publishing/summary`     | P1   | 发布页统计卡               |
| GET    | `/analytics/overview`     | P1   | 复盘页概览                 |
| GET    | `/agent-runs` 扩展 query  | V1.1 | 分页、agentType、日期筛选  |
| GET    | `/dashboard/stats` alerts | V1.1 | 工作台告警                 |
| DELETE | `/versions/:versionId`    | 待定 | 删除草稿版本               |
| —      | 发布页草稿同步/发布包     | P3   | TurboPush 扩展，MVP 不对接 |

## 二十二、与运营流程的关系

接口调用主线：

```text
/accounts + /account-profiles
  ↓
/ima/config + /ima/knowledge-bases + /materials/library
  ↓
/topics
  ↓
/contents + /contents/:id/versions
  ↓
/agents/*/run + /agent-runs
  ↓
/reviews
  ↓
/publishing/tasks
  ↓
/analytics/*
  ↓
/dashboard/stats

/integration/*  ← 外部 Agent 回调本平台的接入管理（并行模块）
/settings + /users  ← 系统级配置（P2）
```

约束：

1. 未授权账号不能进入发布执行。
2. Agent 生成结果必须写入内容版本后再审核。
3. 审核通过后才进入发布任务。
4. 发布记录是数据复盘的数据入口。
5. 复盘结论反哺选题、账号画像、知识库和 Prompt。
