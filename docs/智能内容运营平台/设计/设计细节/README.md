# Agentic Content Studio

基于 [TurboPush](https://github.com/turbopush/turbopush) 二开的 **Agent 驱动智能内容运营中台**（第一阶段 MVP）。

## 仓库

| 项 | 值 |
| --- | --- |
| GitHub | [ATGCS/agentic-content-studio](https://github.com/ATGCS/agentic-content-studio) |
| Clone | `git clone https://github.com/ATGCS/agentic-content-studio.git` |
| 组织 | ATGCS |
| 许可证 | MIT |

## 产品命名对照

| 场景 | 名称 |
| ---- | ---- |
| 仓库 / 目录 | `agentic-content-studio` |
| 英文产品名 | **Agentic Content Studio** |
| 中文产品名 | 智能内容运营工作台（中台） |
| npm scope（建议） | `@agentic-content-studio/*` 或 `@acs/*` |

## 文档索引

| 文档 | 说明 |
| ---- | ---- |
| [第一阶段（必须有）.md](./第一阶段（必须有）.md) | 开工清单与完成状态 |
| [基于 TurboPush 改造的 AI 内容运营中台详细设计文档 V1.md](./基于%20TurboPush%20改造的%20AI%20内容运营中台详细设计文档%20V1.md) | 总体设计 |
| [数据库设计文档 V1.md](./数据库设计文档%20V1.md) | Prisma / ER |
| [API设计文档 V1.md](./API设计文档%20V1.md) | REST 约定 |
| [openapi.yaml](./openapi.yaml) | OpenAPI 3 |
| [页面原型文档 V1.md](./页面原型文档%20V1.md) | 低保真原型 |
| [UI设计规范 V1.md](./UI设计规范%20V1.md) | 视觉规范与组件约定 |
| [Agent Runtime 设计文档 V1.md](./Agent%20Runtime%20设计文档%20V1.md) | 自研 Runtime |
| [TurboPush 二开方案 V1.md](./TurboPush%20二开方案%20V1.md) | 与上游边界 |
| [权限模型 V1.md](./权限模型%20V1.md) | RBAC |
| [开发规范文档 V1.md](./开发规范文档%20V1.md) | Monorepo 规范 |
| [开发排期 V1.md](./开发排期%20V1.md) | Sprint 计划 |

## 核心闭环

```text
选题 → IMA 搜索 → Agent 生成 → 多平台版本 → 人工审核 → TurboPush 发布 → 数据回收 → 复盘
```
