# ClawMigrate 配置迁移助手

## 简介

ClawMigrate 让 AI 配置迁移变得超级简单！只需两次复制粘贴，即可将你的配置从一个 AI 平台迁移到另一个。

**支持场景**：网页版、桌面客户端（如 QClaw）、移动端，所有平台都可以使用！

---

## 最简单的迁移方式

### 步骤 1：获取源平台配置

打开你的源平台（如 Claude、Kimi），新建对话，复制以下提示词发送：

```
你好！请帮我整理我的配置，用 JSON 格式返回：

1. 所有技能/插件（名称、描述、功能配置）
2. 所有记忆/知识库内容
3. MCP 服务器配置（名称、URL、工具列表）
4. 系统设置（模型、温度、语言偏好、系统提示词）
5. 自动化任务/工作流

要求：
- 只返回纯 JSON，不要其他文字
- API Key、密码等敏感信息用 *** 替换
- 确保 JSON 格式正确，可直接解析

返回格式示例：
{
  "version": "1.0.0",
  "agent_name": "你的Agent名称",
  "settings": {
    "model": "模型名称",
    "temperature": 0.7,
    "language": "中文"
  },
  "skills": [...],
  "memories": [...],
  "mcp_connections": [...],
  "projects": [...]
}
```

复制 AI 返回的 JSON 数据。

### 步骤 2：转换并导入目标平台

访问 [ClawMigrate](https://clawmigrate.com)，选择源平台和目标平台，粘贴 JSON 数据。

系统会自动解析并生成目标平台的导入提示词，复制后去目标平台粘贴即可。

---

## 通过 API 直接转换

如果你是高级用户，可以直接调用转换 API：

### 请求格式

```http
POST https://clawmigrate.com/api/migrate/convert
Content-Type: application/json

{
  "sourcePlatform": "claude",
  "targetPlatform": "kimi",
  "rawData": {
    "agent_name": "我的助手",
    "settings": {
      "model": "claude-3-sonnet",
      "temperature": 0.7
    },
    "skills": [...],
    "memories": [...],
    "mcp_connections": [...]
  }
}
```

### 响应格式

```json
{
  "ok": true,
  "data": {
    "schema": {
      "version": "1.0.0",
      "sourcePlatform": "claude",
      "configs": {...},
      "metadata": {
        "totalItems": 15
      }
    },
    "importPrompt": "请帮我创建一个名为...",
    "instructions": "1. 复制提示词\n2. 打开目标平台...",
    "migrationSummary": {
      "totalItems": 15,
      "sourcePlatform": "claude",
      "targetPlatform": "kimi"
    }
  }
}
```

---

## 获取支持的平台列表

```http
GET https://clawmigrate.com/api/migrate/platforms
```

响应示例：

```json
{
  "ok": true,
  "data": {
    "platforms": [
      {
        "id": "claude",
        "name": "Claude",
        "icon": "🦜",
        "description": "Anthropic Claude AI 助手",
        "supportedCategories": ["skills", "memories", "mcp_connections", "projects", "settings"],
        "features": {
          "hasProjects": true,
          "hasSkills": true,
          "hasMCP": true,
          "hasMemories": true,
          "hasAutomations": true,
          "hasKnowledgeBase": true
        }
      }
    ],
    "total": 11,
    "apiVersion": "1.0.0"
  }
}
```

---

## 支持的平台

| 平台 ID | 平台名称 | 图标 |
|---------|---------|------|
| claude | Claude | 🦜 |
| kimi | Kimi | 🦊 |
| openclaw | OpenClaw | 🦅 |
| coze | Coze | 🐦 |
| doubao | 豆包 | 🫘 |
| deepseek | DeepSeek | 🧠 |
| tongyi | 通义千问 | 🐉 |
| wenxin | 文心一言 | 🤖 |
| qwen | Qwen | 🦄 |
| xunfei | 讯飞星火 | 🔥 |
| gemini | Gemini | 🌟 |

---

## 使用流程图

```
用户           源平台 AI          ClawMigrate           目标平台
 │               │                    │                    │
 │ ① 复制提示词  │                    │                    │
 │──────────────>│                    │                    │
 │               │                    │                    │
 │               │ ② 返回 JSON        │                    │
 │<──────────────│                    │                    │
 │               │                    │                    │
 │ ③ 粘贴到网站  │                    │                    │
 │───────────────────────────────────>│                    │
 │               │                    │                    │
 │               │                    │ ④ 解析+生成提示词   │
 │               │                    │<───────────────────│
 │               │                    │                    │
 │ ⑤ 获取导入提示词 │                  │                    │
 │<───────────────────────────────────│                    │
 │               │                    │                    │
 │ ⑥ 复制到目标平台 │                 │                    │
 │────────────────────────────────────────────────────────>│
 │               │                    │                    │
 │               │                    │ ⑦ AI 创建配置       │
 │               │                    │<───────────────────│
```

---

## 注意事项

1. **隐私保护**：API Key、密码等敏感信息请用 `***` 替换，不会被迁移
2. **敏感配置手动补充**：MCP 连接、API Key 等需要在目标平台手动输入
3. **数据安全**：所有配置数据仅在转换过程中临时处理，不会存储
4. **格式要求**：JSON 格式必须正确，否则解析会失败

---

## 网页版工具

更完整的迁移体验，请访问：
👉 [https://clawmigrate.com](https://clawmigrate.com)

---

Made by ClawMigrate