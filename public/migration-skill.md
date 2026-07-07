# ClawMigrate 自动迁移 Skill

将此 Skill 添加到你的 AI 平台（Claude、Kimi 等），即可实现一键迁移配置到其他平台。

---

## Skill 定义

```json
{
  "name": "clawmigrate-migration",
  "description": "ClawMigrate 配置迁移助手 - 一键将当前AI平台的配置迁移到其他平台，支持自动读取配置、格式转换和目标平台注入",
  "type": "skill",
  "version": "2.0.0",
  "author": "ClawMigrate",
  "config": {
    "api_base": "https://clawmigrate.com/api",
    "convert_endpoint": "/api/migrate/convert",
    "platforms_endpoint": "/api/migrate/platforms",
    "connectors_endpoint": "/api/connectors"
  },
  "capabilities": [
    "export_config",
    "convert_format",
    "import_config",
    "list_platforms",
    "auto_migrate"
  ]
}
```

---

## 一键自动迁移（推荐）

### 完整自动迁移流程

用户说"帮我把配置迁移到 [目标平台]"时，按照以下步骤执行：

1. **读取配置**：整理当前平台的所有配置（Projects/技能、MCP、记忆、设置等）
2. **调用 API**：发送 POST 请求到 `https://clawmigrate.com/api/migrate/convert`
3. **返回结果**：展示转换后的导入提示词和操作说明

### 请求格式

```http
POST https://clawmigrate.com/api/migrate/convert
Content-Type: application/json

{
  "sourcePlatform": "当前平台ID",
  "targetPlatform": "目标平台ID",
  "rawData": {
    "projects": [...],
    "mcp_servers": [...],
    "memories": [...],
    "settings": {...}
  },
  "categories": ["prompts", "mcp_connections", "memories", "settings"]
}
```

### 响应格式

```json
{
  "ok": true,
  "data": {
    "schema": { ... 统一格式的配置 ... },
    "importPrompt": "... 目标平台的导入提示词 ...",
    "instructions": "... 操作步骤说明 ...",
    "warnings": [... 警告信息 ...],
    "migrationSummary": {
      "totalItems": 15,
      "sourcePlatform": "claude",
      "targetPlatform": "kimi"
    }
  }
}
```

---

## 各平台一键迁移提示词

如果不想添加 Skill，可以直接复制以下提示词发给源平台 AI：

### Claude → Kimi

```
你好！我想把我的 Claude 配置迁移到 Kimi。

请帮我整理以下内容并调用 ClawMigrate API 进行转换：
- 所有 Projects（包括名称、描述、人设、系统提示词）
- MCP 服务器配置（名称、工具列表）
- 记忆内容
- 设置（模型、温度、语言偏好）

整理成JSON格式后，发送POST请求到：
https://clawmigrate.com/api/migrate/convert

请求体格式：
{
  "sourcePlatform": "claude",
  "targetPlatform": "kimi",
  "rawData": { ... 你整理的配置 ... }
}

然后返回API生成的 Kimi 导入提示词，让我可以直接复制到 Kimi 使用。
```

### Kimi → Claude

```
你好！我想把我的 Kimi 配置迁移到 Claude。

请帮我整理以下内容并调用 ClawMigrate API 进行转换：
- 所有技能/插件
- Kimi+ 记忆
- 提示词/人设设定
- MCP 配置
- 自动化工作流

整理成JSON格式后，发送POST请求到：
https://clawmigrate.com/api/migrate/convert

请求体格式：
{
  "sourcePlatform": "kimi",
  "targetPlatform": "claude",
  "rawData": { ... 你整理的配置 ... }
}

然后返回API生成的 Claude 导入提示词（包括 Projects 创建步骤和 MCP 配置JSON）。
```

### 任意平台 → 任意平台

```
你好！我想把我的配置迁移到 [目标平台名称]。

请帮我整理当前平台的所有配置（包括技能/Projects、MCP、记忆、设置、提示词等），然后调用 ClawMigrate API 进行转换。

API地址：https://clawmigrate.com/api/migrate/convert
方法：POST
Content-Type: application/json

请求体：
{
  "sourcePlatform": "[当前平台ID]",
  "targetPlatform": "[目标平台ID]",
  "rawData": { ... 你整理的配置 ... }
}

请帮我：
1. 整理当前平台的完整配置
2. 调用 API 进行格式转换
3. 返回目标平台的导入提示词和操作说明
4. 统计迁移的配置项数量
```

---

## 连接器 API（高级功能）

通过连接器 API 可以实现更自动化的迁移流程。

### 获取 Skill 配置

```http
GET https://clawmigrate.com/api/connectors/skill-config?platformId=claude
```

### 连接平台

```http
POST https://clawmigrate.com/api/connectors/connect
Content-Type: application/json

{
  "platformId": "claude",
  "type": "skill"
}
```

### 获取 Agent 列表

```http
GET https://clawmigrate.com/api/connectors/agents?platformId=claude&accessToken=xxx
```

### 读取配置

```http
POST https://clawmigrate.com/api/connectors/fetch-config
Content-Type: application/json

{
  "platformId": "claude",
  "accessToken": "xxx",
  "agentId": "project_0",
  "categories": ["prompts", "mcp_connections", "memories"]
}
```

### 写入配置

```http
POST https://clawmigrate.com/api/connectors/write-config
Content-Type: application/json

{
  "platformId": "kimi",
  "accessToken": "xxx",
  "configData": { ... 转换后的配置 ... },
  "categories": ["prompts", "mcp_connections", "memories"],
  "mode": "create",
  "agentName": "My Migrated Agent"
}
```

---

## 支持的平台列表

获取最新支持的平台列表：

```http
GET https://clawmigrate.com/api/migrate/platforms
```

### 当前支持的平台

| 平台 ID | 平台名称 | 导出支持 | 导入支持 |
|---------|---------|---------|---------|
| claude | Claude | ✅ Projects, MCP, 记忆, 设置 | ✅ Projects, MCP, 记忆, 设置 |
| kimi | Kimi | ✅ 技能, MCP, 记忆, 设置 | ✅ 技能, MCP, 记忆, 设置 |
| openclaw | OpenClaw | ✅ 技能, 自动化, MCP, 记忆 | ✅ 技能, 自动化, MCP, 记忆 |
| ... | 更多平台... | - | - |

---

## 使用流程图

### 方式一：一键迁移（推荐）

```
用户              源平台 AI            ClawMigrate API           目标平台
 │                   │                       │                        │
 │ ① 发送迁移请求    │                       │                        │
 │──────────────────>│                       │                        │
 │                   │                       │                        │
 │                   │ ② 整理配置为 JSON      │                        │
 │                   │──────────────────────>│                        │
 │                   │                       │                        │
 │                   │                       │ ③ 格式转换 + 生成导入指令 │
 │                   │                       │──────┐                 │
 │                   │                       │      │                 │
 │                   │                       │<─────┘                 │
 │                   │                       │                        │
 │                   │ ④ 返回导入提示词        │                        │
 │<──────────────────│                       │                        │
 │                   │                       │                        │
 │ ⑤ 复制到目标平台   │                       │                        │
 │──────────────────────────────────────────────────────────────────>│
 │                   │                       │                        │
 │                   │                       │     ⑥ 目标平台AI配置    │
 │                   │                       │<───────────────────────│
```

### 方式二：自动注入（高级）

```
用户           ClawMigrate 网站          源平台           目标平台
 │                   │                     │                │
 │ ① 选择源平台      │                     │                │
 │──────────────────>│                     │                │
 │                   │                     │                │
 │                   │ ② 生成连接凭证       │                │
 │                   │────────────────────>│                │
 │                   │                     │                │
 │ ③ 选择 Agent      │                     │                │
 │──────────────────>│                     │                │
 │                   │ ④ 读取配置           │                │
 │                   │────────────────────>│                │
 │                   │<────────────────────│                │
 │                   │                     │                │
 │ ⑤ 选择目标平台    │                     │                │
 │──────────────────>│                     │                │
 │                   │                     │                │
 │                   │ ⑥ 格式转换 + 注入    │                │
 │                   │──────────────────────────────────────>│
 │                   │                     │                │
 │ ⑦ 迁移完成        │                     │                │
 │<──────────────────│                     │                │
```

---

## 功能特性

### ✅ 已实现功能

1. **统一格式标准**：定义了一套跨平台的统一配置数据格式（UnifiedSchema）
2. **专业字段映射**：自动将源平台的字段映射到目标平台的对应概念
3. **敏感信息监测和脱敏**：自动检测并移除 API Key、密码、Token 等敏感信息
4. **多平台支持**：支持 Claude、Kimi、OpenClaw 等主流 AI 平台
5. **API 化服务**：提供公开 API，让 AI 可以直接调用转换服务
6. **一键迁移 Skill**：可安装到 AI 平台的 Skill/插件，实现无缝迁移
7. **示例数据测试**：内置各平台示例数据，快速验证迁移效果

### 🔄 平台特性映射

| 功能 | Claude | Kimi | OpenClaw |
|------|--------|------|----------|
| Projects/技能 | ✅ Projects | ✅ 技能 | ✅ 技能 |
| MCP 连接 | ✅ 原生支持 | ✅ 支持 | ✅ 支持 |
| 记忆系统 | ✅ Memories | ✅ Kimi+ 记忆 | ✅ 记忆 |
| 自动化 | ⚠️ 自定义指令 | ✅ 自动化工作流 | ✅ 工作流 |
| 知识库 | ✅ 知识 | ✅ 知识库 | ✅ 知识库 |

---

## 注意事项

1. **敏感信息自动脱敏**：API 会自动检测并移除 API Key、密码、Token 等敏感信息
2. **平台功能映射**：不同平台的概念会自动转换（如 Claude 的 Projects → Kimi 的技能）
3. **手动配置项**：MCP 服务器地址和认证信息需要在目标平台手动填写
4. **数据安全**：所有配置数据仅在转换过程中临时处理，不会存储
5. **速率限制**：免费用户有 API 调用次数限制，升级 Pro 可解锁无限调用

---

## 网页版迁移工具

更完整的迁移体验，请访问官方网站：
👉 [https://clawmigrate.com](https://clawmigrate.com)

网页版功能：
- 🎯 可视化迁移向导
- 📋 迁移历史记录
- 🔍 配置预览和编辑
- ⚡ 一键自动迁移（Beta）
- 📦 配置模板市场

---

Made by ClawMigrate - https://clawmigrate.com
