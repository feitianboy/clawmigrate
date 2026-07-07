export const sampleExports: Record<string, Record<string, unknown>> = {
  claude: {
    version: '1.0.0',
    projects: [
      {
        name: '写作助手',
        description: '专注于创意写作和文案创作的工作空间',
        persona_description: '你是一位专业的写作助手，擅长创意写作、文案策划、故事构思。',
        system_prompt: '作为写作助手，请帮助用户完成各类写作任务...',
        tools: ['mcp-search', 'mcp-file-manager'],
      },
      {
        name: '编程助手',
        description: '代码开发和技术问题解决',
        persona_description: '你是一位资深软件工程师，精通多种编程语言和开发框架。',
        tools: ['mcp-code-analyzer', 'mcp-git'],
      },
    ],
    mcp_servers: [
      {
        name: 'mcp-search',
        transport_type: 'stdio',
        tools: ['web_search', 'image_search'],
        description: '网络搜索工具',
      },
    ],
    settings: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      language: '中文',
      persona_description: '我是一位全能型AI助手',
    },
    memories: [
      {
        content: '用户偏好使用中文交流',
        type: 'preference',
        tags: ['语言'],
      },
    ],
  },

  kimi: {
    version: '1.0.0',
    skills: [
      {
        name: '文档写作',
        description: '专业文档撰写和编辑技能',
        type: 'skill',
        config: {
          content: '帮助用户撰写各类专业文档',
          tools: ['search', 'file_upload'],
        },
      },
    ],
    prompts: [
      {
        name: '写作人设',
        content: '你是一位专业的写作助手，擅长各类文案创作。',
        type: 'character',
        tags: ['写作'],
      },
    ],
    mcp_servers: [
      {
        name: 'mcp-web-tools',
        transport_type: 'sse',
        tools: ['fetch_url', 'extract_content'],
        description: '网页内容获取工具',
      },
    ],
    settings: {
      model: 'moonshot-v1-32k',
      temperature: 0.8,
      language: '中文',
      persona_description: 'Kimi智能助手',
    },
    memories: [
      {
        content: '用户经常需要处理长文档',
        type: 'preference',
        tags: ['文档'],
      },
    ],
  },

  openclaw: {
    version: '1.0.0',
    agent_name: '全能助手',
    agent_description: '一个高度可定制的智能助手',
    prompts: [
      {
        name: '系统人设',
        content: '你是OpenClaw全能助手，具备多种技能。',
        type: 'system',
        priority: 1,
      },
    ],
    skills: [
      {
        name: '任务管理',
        description: '任务创建、跟踪和管理',
        type: 'plugin',
        config: {
          content: '帮助用户管理日常任务',
          tools: ['task_create', 'task_update'],
        },
        enabled: true,
      },
    ],
    automations: [
      {
        name: '每日摘要',
        description: '每天自动生成工作摘要',
        trigger: '每天早上9点',
        actions: ['读取昨日笔记', '生成摘要报告'],
      },
    ],
    settings: {
      model: 'default',
      temperature: 0.7,
      language: '中文',
    },
    memories: [
      {
        content: '用户每周需要生成工作报告',
        type: 'instruction',
        tags: ['工作流'],
      },
    ],
  },
};
