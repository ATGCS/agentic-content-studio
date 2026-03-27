# TurboPush 官方网站 | [MCP服务,对接AI大模型或龙虾](https://github.com/xueyc1f/turbopush-mcp)

<div align="center">

<img src="https://www.turbopush.top/logo.png" alt="TurboPush Logo" width="150" height="auto" />

**一键发布工具TurboPush 先锋版震撼发布！**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

[🌐 官方网站](https://www.turbopush.top) | [📥 立即下载](https://www.turbopush.top/#download) | [📖 安装指南](#installation)

</div>

## 💬 群聊

| QQ                       | WX                       |
| ------------------------ | ------------------------ |
| ![QQ](./public/tpqq.jpg) | ![WX](./public/tpwx.jpg) |

## 已支持平台

| 支持平台   | 支持类型       |
| ---------- | -------------- |
| 微信公众号 | 文章/图文/视频 |
| 头条       | 文章/图文/视频 |
| 知乎       | 文章/图文/视频 |
| 百家号     | 文章/图文/视频 |
| 新浪微博   | 文章/图文/视频 |
| 企鹅号     | 文章/视频      |
| 掘金       | 文章/图文      |
| B站        | 文章/视频      |
| A站        | 文章/视频      |
| 简书       | 文章           |
| 小红书     | 图文/视频      |
| 抖音       | 图文/视频      |
| 快手       | 图文/视频      |
| 微信视频号 | 图文/视频      |
| 微视       | 视频           |
| CSDN       | 文章/视频      |
| TikTok     | 视频           |
| YouTube    | 视频           |
| X          | 图文/视频      |
| 拼多多     | 视频           |

## 🚀 关于 TurboPush

TurboPush 是一款基于 **Tauri + React** 构建的跨平台桌面应用，专为内容创作者打造的多平台内容管理解决方案。**先锋版完全免费**，支持 Mac、Windows、Linux 系统，安装包仅 20M 左右。

### ✨ 核心特性

- **🌐 跨平台内容发布**：一键发布至微信、头条、知乎、微博等多个社交平台
- **📝 内置 Markdown 编辑器**：集成 [doocs md](https://github.com/doocs/md) 编辑器并深度定制，支持本地图库，支持docx/html/wiki等文件与markdown互转
- **🔒 数据安全保障**：所有数据本地存储，敏感信息加密保护
- **⚡ 高效轻量**：Rust 后端 + TypeScript 前端，极致性能体验
- **📊 数据分析**：自动统计阅读量、评论、收藏等数据，优化内容策略
- **🎨 样式兼容**：全平台文章样式不错乱，保持一致的视觉效果

## 🎯 为什么选择 TurboPush？

### 💡 功能亮点

- **集成开源**：内置 [doocs md](https://github.com/doocs/md) (WeChat Markdown Editor)，无需配置图库，开箱即用
- **统一界面**：支持浏览器发布和后台发布，不影响其他工作
- **模板设置**：保存常用平台配置为模板，真正做到一键发布
- **多账号管理**：轻松绑定与切换多平台账户，支持同平台多账号
- **实时同步**：SSE 实时更新，内容发布状态即时同步

### 🛡️ 安全优势

- **本地存储**：所有数据均在本地存储，不收集用户任何数据，欢迎技术大佬抓包验证
- **隐私保护**：登录无需手机号/邮箱，仅需公众号验证码
- **数据加密**：敏感数据本地加密存储，只能被用户账号解密

## 🔧 技术栈

本网站基于现代化技术栈构建：

- **框架**: Next.js 15.4.2
- **UI 库**: React 19.1.0
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **组件**: Radix UI
- **图标**: Lucide React
- **部署**: Vercel

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm/yarn/pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### 构建部署

```bash
npm run build
npm run start
```

## 📱 TurboPush 应用安装说明 {#installation}

### macOS 系统

由于代码未进行签名，Mac 安装后可能提示"已损坏/未验证的开发者"：

1. 点击取消
2. 在终端执行：
   ```bash
   sudo xattr -rd com.apple.quarantine "/Applications/Turbo Push.app"
   ```
3. 输入系统密码即可正常使用

### Windows 系统

- 推荐使用 Chrome 或 Edge 浏览器下载
- 如使用 Edge 浏览器，请选择"保留"选项完成下载
- 下载完成后直接安装即可

### Linux 系统

提供deb 和AppImage，请自行选择对应版本。

> **声明**：出现安全提示并非程序存在问题，仅因未使用官方证书签名所致。

## 📊 项目脚本

```bash
# 开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 代码格式化
npm run format

# SEO 检查
npm run seo:check
```

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源协议。

## 🔗 相关链接

- [官方网站](https://www.turbopush.top)
- [下载页面](https://www.turbopush.top/#download)
- [使用指南](https://www.turbopush.top/#guide)
- [联系我们](https://www.turbopush.top/#contact)
- [doocs md 编辑器](https://github.com/doocs/md) - 感谢开源项目支持

## 📞 联系我们

如有问题或建议，欢迎通过以下方式联系：

- 官方网站：[https://www.turbopush.top](https://www.turbopush.top/#contact)
- kube.call@gmail.com

---

<div align="center">

**让创作更高效，让发布更简单**

Made with ❤️ by TurboPush Team

</div>
