# UI 设计规范 V1

**产品**：Agentic Content Studio（智能内容运营工作台）  
**定稿选项**：深色渐变侧栏 / 火山蓝主色 `#1664FF` / 四色渐变指标卡  
**技术栈**：Next.js 15 + Tailwind 4 + shadcn/ui  
**素材库**：Uiverse Galaxy（按钮流光、登录页、空状态）

---

## 1. 设计定位

B 端智能运营中台 — 参考火山引擎控制台布局、饿了么商家后台数据卡片节奏。渐变用于品牌区与主操作，表格表单保持干净可读。

## 2. 色彩 Token

| Token | 值 | 用途 |
|-------|-----|------|
| brand-500 | `#1664FF` | 主按钮、链接、激活态 |
| brand-600 | `#0550ED` | 渐变深色端 |
| brand-400 | `#4480FF` | 渐变浅色端 |
| brand-50 | `#F0F5FF` | 次要按钮底 |
| accent-purple | `#7C3AED` | AI / Prompt |
| accent-cyan | `#06B6D4` | 数据分析 |
| accent-orange | `#FF6A00` | 待办 / 待审核 |
| accent-green | `#00B42A` | 成功 |
| bg-canvas | `#EEF2F8` | 主内容区 |
| text-primary | `#1D2129` | 主文字 |
| text-secondary | `#86909C` | 辅助文字 |

## 3. 内容状态色

| 状态 | 颜色 |
|------|------|
| 草稿 / 待生成 | 灰蓝 |
| 生成中 | 紫 |
| 待审核 | 橙 |
| 已通过 | 绿 |
| 已发布 | 蓝 |
| 失败 / 驳回 | 红 |

实现：`apps/web/src/lib/tokens.ts` + `StatusBadge` 组件。

## 4. 布局

- 侧栏 220px，深色渐变，分组导航
- 顶栏毛玻璃 + 搜索 + 状态
- 主区 mesh 渐变背景
- 页面结构：PageHeader → ActionBar（可选）→ StudioCard 内容

## 5. 组件变体

| 组件 | 变体 |
|------|------|
| Button | primary / glow / soft / outline / danger |
| Card | StudioCard（玻璃）/ StatCard（渐变指标） |
| Badge | StatusBadge（按业务状态映射） |
| 空状态 | EmptyState + CTA |

## 6. 页面清单

Dashboard、Topics、Contents、AI Generate、Reviews、Publishing、Analytics、Accounts、Prompts、Login

## 7. 代码映射

| 路径 | 说明 |
|------|------|
| `apps/web/src/app/globals.css` | Design Token + 工具类 |
| `apps/web/src/lib/tokens.ts` | TS 常量与状态映射 |
| `apps/web/src/components/studio/*` | 业务 UI 组件 |
| `apps/web/src/components/layout/*` | 布局壳 |
