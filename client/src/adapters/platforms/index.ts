// 平台适配器统一入口
// 导出所有平台适配器数组和工具函数

import { cozeAdapter } from './coze';
import { claudeAdapter } from './claude';
import { kimiAdapter } from './kimi';
import { openclawAdapter } from './openclaw';
import { qclawAdapter } from './qclaw';
import { workbuddyAdapter } from './workbuddy';
import { maxclawAdapter } from './maxclaw';
import { duclawAdapter } from './duclaw';
import { autoclawAdapter } from './autoclw';
import { arkclawAdapter } from './arkclaw';
import { claw360Adapter } from './claw360';
import { easyclawAdapter } from './easyclaw';
import { PlatformAdapter } from '../core/types';

export const adapters: PlatformAdapter[] = [
  cozeAdapter,
  claudeAdapter,
  kimiAdapter,
  openclawAdapter,
  qclawAdapter,
  workbuddyAdapter,
  maxclawAdapter,
  duclawAdapter,
  autoclawAdapter,
  arkclawAdapter,
  claw360Adapter,
  easyclawAdapter,
];

export const getAdapterById = (id: string): PlatformAdapter | undefined =>
  adapters.find(a => a.id === id);

// 导出各个平台适配器供直接引用
export { cozeAdapter } from './coze';
export { claudeAdapter } from './claude';
export { kimiAdapter } from './kimi';
export { openclawAdapter } from './openclaw';
export { qclawAdapter } from './qclaw';
export { workbuddyAdapter } from './workbuddy';
export { maxclawAdapter } from './maxclaw';
export { duclawAdapter } from './duclaw';
export { autoclawAdapter } from './autoclw';
export { arkclawAdapter } from './arkclaw';
export { claw360Adapter } from './claw360';
export { easyclawAdapter } from './easyclaw';
