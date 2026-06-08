# ClawMigrate - 项目笔记

## 项目概述
ClawMigrate 是一个纯前端单页应用，帮助用户在不同 AI 助手平台之间迁移配置（Skills、定时任务、记忆、MCP连接等）。

## 技术栈
- **架构**: 单文件 HTML/CSS/JS，零构建、零依赖
- **字体**: Google Fonts (Newsreader, Inter Tight, JetBrains Mono)
- **样式**: CSS 变量 + Grid + Flexbox
- **部署**: 可直接静态托管（Gitee Pages / Cloudflare Pages）

## 核心功能

### 1. 5步向导流程
1. 选择源平台（QClaw/WorkBuddy/OpenClaw/Claude/Kimi）
2. 生成导出提示词
3. 粘贴回复，解析 JSON，勾选要迁移的内容
4. 选择目标平台，查看字段映射
5. 生成导入提示词

### 2. JSON智能解析
支持多种格式：
- 直接 JSON
- ```json ... ``` 代码块
- ``` ... ``` 代码块
- 混合文本中的 JSON（自动提取 { } 包裹内容）
- 解析失败时显示错误信息并保留原始内容

### 3. 字段映射系统
内置 5 个平台的字段映射表：
- QClaw / WorkBuddy: 字段名相同（automations, skills, mcp_connections, user_memory, system_settings）
- OpenClaw: scheduled_tasks, tools, mcps, memory, preferences
- Claude: recurring_tasks, capabilities, connectors, project_memory, preferences
- Kimi: 定时任务, 技能, MCP服务, 用户记忆, 偏好设置

### 4. 敏感信息检测
自动扫描以下内容：
- 值为 `[REDACTED]` 的字段
- 字段名包含 token/secret/key/password/credential/api_key
- redacted_fields 数组中的路径

### 5. 导入提示词生成
整合勾选内容、字段映射、敏感信息列表，生成目标平台专属提示词

## 设计决策

### 视觉风格
- **主色**: 深色背景 #0E0D0B（带暖色微染），前景 #F2EEE6（米白）
- **强调色**: 琥珀色 #FF7A1A（主操作）、酸绿 #7FFF6E（成功）、暗红 #D94848（警示）
- **边框**: 2px 实线，不用阴影
- **字体组合**: Newsreader（标题）+ Inter Tight（正文）+ JetBrains Mono（代码）

### 交互设计
- 步骤指示器：5个圆点，完成变绿，当前变琥珀色
- 平台卡片：选中时左边显示琥珀色竖条
- 按钮：hover 反色效果
- 复制按钮：复制成功变绿色
- 平滑过渡动画（400ms cubic-bezier）

### 敏感信息处理策略
- 不加密传输（源平台已脱敏）
- 扫描后在导入提示词中要求目标平台主动询问用户
- 用户友好名展示（如 "WPS Token" 而非 "mcp.wps.token"）

## 待修复/待验证

- [ ] QClaw JSON解析 - 已增加兜底逻辑但未实测
- [ ] WorkBuddy字段映射 - 需验证是否是缓存问题
- [ ] OpenClaw/Claude/Kimi - 字段映射未实测
- [ ] 第4步迁移预览 - 当前为静态展示，可考虑增强交互性

## 部署方案

### Gitee Pages（主选）
- 仓库: https://gitee.com/feitianboy2026/claw-migrate
- 可能需要实名认证

### Cloudflare Pages（备选）
- 无需实名认证
- 全球加速

### 本地开发
```bash
cd claw-migrator
python3 -m http.server 8000
```

## 测试建议

### 单元测试场景
1. 直接 JSON 解析
2. ```json ``` 包裹解析
3. 纯文本 + JSON 混合解析
4. 字段名不匹配时的兜底展示
5. 敏感信息 [REDACTED] 扫描
6. 字段映射可视化正确性

### 端到端测试
5个平台 × 5个平台 = 25种迁移组合

## 性能指标
- 首屏加载: < 1s（除字体外无外部资源）
- 文件大小: < 80KB
- gzip压缩: < 30KB
- 完全离线可用

## 版本记录

### v1.0.0
- 初始版本
- 支持5个平台
- 5步向导流程
- JSON智能解析
- 字段映射可视化
- 敏感信息检测

## 代码结构

```
index.html
├── <head>
│   ├── Google Fonts 引入
│   └── <style> 完整样式（设计 token + 布局 + 组件）
└── <body>
    ├── 顶部品牌区 + 步骤指示器
    ├── 5个步骤面板
    ├── 底部导航
    └── <script>
        ├── CONSTANTS（平台列表、字段映射、友好名）
        ├── STATE（状态管理）
        ├── parseSourceText（JSON解析）
        ├── scanSensitiveFields（敏感信息扫描）
        ├── buildExportPrompt（导出提示词生成）
        ├── buildImportPrompt（导入提示词生成）
        ├── renderPlatformGrid（平台选择渲染）
        ├── renderParseResult（解析结果渲染）
        ├── renderFieldMapping（字段映射渲染）
        └── initEventListeners（事件绑定）
```

## 踩坑记录

1. **服务器端口**: 确认使用 8000 而非 8080
2. **字体加载**: 使用 Google Fonts 预加载提升首屏体验
3. **JSON解析容错**: 需要支持多种格式（代码块、纯文本、混合）
4. **状态管理**: 使用简单对象而非复杂框架，保持轻量
5. **响应式适配**: 移动端按钮高度增加到 48px 确保触摸友好
6. **深色模式对比度**: 避免纯黑纯白，使用暖色微染的深色背景

## 安全注意事项

- 所有数据处理在客户端完成，不上传服务器
- 敏感信息不上传、不存储
- localStorage 仅保存平台偏好（非敏感数据）
- 建议用户在隐私模式下使用

## 未来计划

- 支持更多平台
- 添加导出/导入配置文件功能
- 增加迁移预览对比功能
- 添加深色/浅色模式切换
- 支持配置模板保存

## 参考资料

- PRD: `/workspace/.trae/documents/PRD.md`
- Technical Architecture: `/workspace/.trae/documents/TECHNICAL.md`
- 源码: `/workspace/claw-migrator/index.html`