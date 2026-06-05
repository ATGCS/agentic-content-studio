# Agentic Content Studio

基于 [TurboPush](https://github.com/turbopush/turbopush) 二开的 **Agent 驱动智能内容运营中台**（第一阶段 MVP）。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

| | |
| --- | --- |
| **仓库** | [github.com/ATGCS/agentic-content-studio](https://github.com/ATGCS/agentic-content-studio) |
| **中文名** | 智能内容运营工作台 |
| **状态** | 设计文档阶段，Monorepo 待搭建 |

## 核心闭环

```text
选题 → IMA 搜索 → Agent 生成 → 多平台版本 → 人工审核 → TurboPush 发布 → 数据回收 → 复盘
```

## 文档

设计文档位于 [`docs/智能内容运营平台/`](./docs/智能内容运营平台/README.md)，包含：

- 总体设计与模块依赖
- 数据库（Prisma / SQLite）
- API 与 [OpenAPI](./docs/智能内容运营平台/openapi.yaml)
- 页面低保真原型
- Agent Runtime、TurboPush 二开方案
- 权限模型、开发规范与 Sprint 排期

## 技术栈（规划）

Next.js · Node.js · TypeScript · Prisma · SQLite · 自研 Agent Runtime · IMA · TurboPush Adapter

## License

MIT — see [LICENSE](./LICENSE) if present, or repository default.
