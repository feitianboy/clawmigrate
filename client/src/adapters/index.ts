import { registry } from './core/registry';
export { registry } from './core/registry';
export * from './core/types';

import { cozeAdapter } from './platforms/coze';
import { claudeAdapter } from './platforms/claude';
import { kimiAdapter } from './platforms/kimi';
import { openclawAdapter } from './platforms/openclaw';

// 注册所有平台适配器
registry.register(cozeAdapter);
registry.register(claudeAdapter);
registry.register(kimiAdapter);
registry.register(openclawAdapter);
