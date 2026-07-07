# ClawMigrate 自动迁移 Skill

将此 Skill 添加到你的 AI 平台（Claude、Kimi 等），即可实现一键迁移配置到其他平台。

---

## Skill 定义

```json
{
  "name": "clawmigrate-export",
  "description": "导出当前AI平台的配置并转换为目标平台格式",
  "type": "skill",
  "config": {
    "api_endpoint": "https://clawmigrate.com/api/migrate/convert",
    "platforms_endpoint": "https://clawmigrate.com/api/migrate/platforms"
  },
  "parameters": {
    "target_platform": {
      "type": "string",
      "description": "目标平台ID（如 kimi, claude, openclawaw）",
      "required": true
    },
    "categories": {
      "type": "array",
      "description": "要迁移的配置类别",
      "items": ["prompts", "mcp_connections", "memories", "settings", "skills", "automations"],
      "default": ["prompts", "mcp_connections", "memories", "settings"]
    }
  }
}
```

---

## 一键迁移提示词

如果不想添加Skill，可以直接复制以下提示词发给源平台AI：

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

---

## API 说明

### 获取支持的平台列表

```http
GET https://clawmigrate.com/api/migrate/platforms
```

返回示例：
```json
{
  "ok": true,
  "data": {
    "platforms": [
      { "id": "claude", "name": "Claude", "description": "Anthropic出品..." },
      { "id": "kimi", "name": "Kimi", "description": "Moonshot推出..." }
    ],
    "total": 11,
    "apiVersion": "1.0.0"
  }
}
```

### 执行迁移转换

```http
POST https://clawmigrate.com/api/migrate/convert
Content-Type: application/json
```

请求体：
```json
{
  "sourcePlatform": "claude",
  "targetPlatform": "kimi",
  "rawData": {
    "projects": [...],
    "mcp_servers": [...],
    "memories": [...],
    "settings": {...}
  },
  "categories": ["prompts", "mcp_connections", "memories"]
}
```

返回示例：
```json
{
  "ok": true,
  "data": {
    "schema": { ... 转换后的统一格式 ... },
    "importPrompt": "... 目标平台的导入提示词 ...",
    "instructions": "... 操作说明 ...",
    "warnings": [...],
    "migrationSummary": {
      "totalItems": 15,
      "sourcePlatform": "claude",
      "targetPlatform": "kimi"
    }
  }
}
```

---

## 使用流程图

```
源平台                ClawMigrate API           目标平台
  │                        │                        │
  │ ① 用户发送迁移提示词    │                        │
  │───────────────────────>│                        │
  │                        │                        │
  │ ② AI整理配置为JSON      │                        │
  │───────────────────────>│                        │
  │                        │                        │
  │                        │ ③ API转换格式           │
  │                        │──────┐                 │
  │                        │      │                 │
  │                        │<─────┘                 │
  │                        │                        │
  │ ④ 返回导入提示词        │                        │
  │<───────────────────────│                        │
  │                        │                        │
  │ ⑤ 用户复制到目标平台    │                        │
  │────────────────────────────────────────────────>│
  │                        │                        │
  │                        │     ⑥ 目标平台AI配置    │
  │                        │<───────────────────────│
```

---

## 注意事项

1. **敏感信息自动脱敏**：API会自动检测并移除API Key、密码、Token等敏感信息
2. **平台功能映射**：不同平台的概念会自动转换（如Claude的Projects → Kimi的技能）
3. **手动配置项**：MCP服务器地址和认证信息需要在目标平台手动填写

---

Made by ClawMigrate - https://clawmigrate.com