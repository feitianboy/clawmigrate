// 平台适配器统一入口
// 导出所有平台适配器数组和工具函数

import { cozeAdapter } from './coze';
import { claudeAdapter } from './claude';
import { kimiAdapter } from './kimi';
import { openclawAdapter } from './openclaw';
import { PlatformAdapter } from '../core/types';

export const adapters: PlatformAdapter[] = [
  cozeAdapter,
  claudeAdapter,
  kimiAdapter,
  openclawAdapter,
];

export const getAdapterById = (id: string): PlatformAdapter | undefined =>
  adapters.find(a => a.id === id);

// 导出各个平台适配器供直接引用
export { cozeAdapter } from './coze';
export { claudeAdapter } from './claude';
export { kimiAdapter } from './kimi';
export { openclawAdapter } from './openclaw';
