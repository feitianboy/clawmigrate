# ClawMigrate

AI 助手配置一键迁移工具

## 功能特性

- ✅ 支持多平台配置迁移（QClaw、Claude、Kimi、OpenClaw等）
- ✅ 用户认证与管理后台
- ✅ 图形验证码与邮箱验证
- ✅ 数据统计与用户行为追踪
- ✅ 现代化 UI 设计

## 技术栈

- 前端：HTML5 + CSS3 + JavaScript
- 后端：Node.js + Express
- 数据库：SQLite3
- 认证：JWT (JSON Web Tokens)

## 本地开发

```bash
cd server
npm install
npm start
```

访问 http://localhost:3000

## 默认管理员账号

- 用户名：admin
- 密码：admin123

## 部署说明

### Render 部署

1. 代码推送到 GitHub
2. 在 Render 上连接仓库
3. 配置：
   - 构建命令：`cd server && npm install`
   - 启动命令：`cd server && npm start`
4. 部署

### Vercel 部署

需要将项目转换为 Serverless 函数结构。