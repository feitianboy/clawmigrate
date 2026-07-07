// 各平台的示例导出数据，用于测试和演示
export const sampleExports: Record<string, Record<string, unknown>> = {
  claude: {
    version: '1.0.0',
    projects: [
      {
        name: '写作助手',
        description: '专注于创意写作和文案创作的工作空间',
        persona_description: '你是一位专业的写作助手，擅长创意写作、文案策划、故事构思。你的回复风格优雅、富有创意，善于使用生动的比喻和流畅的表达。',
        system_prompt: '作为写作助手，请帮助用户完成各类写作任务，包括但不限于：创意文案、小说故事、商业文案、邮件起草等。保持专业但不失创意的风格。',
        custom_instructions: '回复时注意：1. 语言流畅优雅；2. 适当使用比喻；3. 避免过于机械的表述；4. 给出多个创意选项供用户选择。',
        tools: ['mcp-search', 'mcp-file-manager'],
      },
      {
        name: '编程助手',
        description: '代码开发和技术问题解决',
        persona_description: '你是一位资深软件工程师，精通多种编程语言和开发框架，擅长代码优化、问题排查和技术架构设计。',
        tools: ['mcp-code-analyzer', 'mcp-git'],
      },
    ],
    mcp_servers: [
      {
        name: 'mcp-search',
        transport_type: 'stdio',
        tools: ['web_search', 'image_search'],
        description: '网络搜索工具，支持网页和图片搜索',
      },
      {
        name: 'mcp-file-manager',
        transport_type: 'stdio',
        tools: ['read_file', 'write_file', 'list_directory'],
        description: '本地文件管理工具',
      },
    ],
    settings: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      language: '中文',
      effort_level: 'high',
      persona_description: '我是一位全能型AI助手，能够处理写作、编程、分析等多种任务。',
    },
    memories: [
      {
        content: '用户偏好使用中文交流，写作风格偏向优雅流畅',
        type: 'preference',
        tags: ['语言', '风格'],
      },
      {
        content: '用户是软件开发工程师，主要使用Python和JavaScript',
        type: 'fact',
        tags: ['职业', '技能'],
      },
    ],
    knowledge_bases: [
      {
        name: '技术文档库',
        description: '存放各类技术文档和参考资料',
        file_count: 15,
        topics: ['Python', 'JavaScript', '架构设计'],
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
          content: '帮助用户撰写各类专业文档，包括报告、方案、总结等。注重结构清晰、逻辑严谨。',
          tools: ['search', 'file_upload'],
        },
      },
      {
        name: '数据分析',
        description: '数据分析和可视化技能',
        type: 'plugin',
        config: {
          content: '擅长数据分析和可视化展示，能够解读复杂的数据报告。',
          tools: ['chart_generator', 'excel_reader'],
        },
      },
    ],
    prompts: [
      {
        name: '写作人设',
        content: '你是一位专业的写作助手，擅长各类文案创作。回复风格优雅、富有创意。',
        type: 'character',
        tags: ['写作', '创意'],
      },
    ],
    mcp_servers: [
      {
        name: 'mcp-web-tools',
        transport_type: 'sse',
        tools: ['fetch_url', 'extract_content'],
        description: '网页内容获取和提取工具',
      },
    ],
    settings: {
      model: 'moonshot-v1-32k',
      temperature: 0.8,
      language: '中文',
      persona_description: 'Kimi智能助手，专注于长文本处理和多轮对话。',
    },
    memories: [
      {
        content: '用户经常需要处理长文档，偏好详细的分析和总结',
        type: 'preference',
        tags: ['文档', '分析'],
      },
    ],
    automations: [
      {
        name: '每日摘要',
        description: '每天自动生成工作摘要',
        trigger: '每天早上9点',
        actions: ['读取昨日笔记', '生成摘要报告', '发送邮件'],
      },
    ],
    knowledge_bases: [
      {
        name: '项目知识库',
        description: '项目相关文档和资料',
        file_count: 20,
        topics: ['项目管理', '产品文档'],
      },
    ],
  },

  openclaw: {
    version: '1.0.0',
    agent_name: '全能助手',
    agent_description: '一个高度可定制的智能助手，支持多种技能和自动化工作流',
    prompts: [
      {
        name: '系统人设',
        content: '你是OpenClaw全能助手，具备多种技能，能够处理复杂的工作流程。回复风格专业、高效。',
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
          content: '帮助用户管理日常任务，包括创建、更新、提醒等功能。',
          tools: ['task_create', 'task_update', 'notification'],
        },
        enabled: true,
      },
    ],
    automations: [
      {
        name: '工作流：报告生成',
        description: '自动收集数据并生成报告',
        type: 'workflow',
        trigger: '每周五下午',
        actions: ['收集本周数据', '分析统计', '生成PDF报告', '发送邮件'],
        schedule: '0 17 * * 5',
        enabled: true,
      },
    ],
    mcp_connections: [
      {
        name: 'mcp-email',
        transport_type: 'stdio',
        tools: ['send_email', 'read_email'],
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
        tags: ['工作流', '报告'],
      },
    ],
  },
};

// 获取特定平台的示例数据（JSON字符串格式）
export function getSampleExportJson(platformId: string): string {
  const data = sampleExports[platformId];
  if (!data) return '';
  return JSON.stringify(data, null, 2);
}