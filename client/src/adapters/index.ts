import { registry } from './core/registry';
export { registry } from './core/registry';
export * from './core/types';
export * from './core/mapper';

import { claudeAdapter } from './platforms/claude';
import { kimiAdapter } from './platforms/kimi';
import { openclawAdapter } from './platforms/openclaw';
import { qclawAdapter } from './platforms/qclaw';
import { workbuddyAdapter } from './platforms/workbuddy';
import { maxclawAdapter } from './platforms/maxclaw';
import { duclawAdapter } from './platforms/duclaw';
import { autoclawAdapter } from './platforms/autoclw';
import { arkclawAdapter } from './platforms/arkclaw';
import { claw360Adapter } from './platforms/claw360';
import { easyclawAdapter } from './platforms/easyclaw';

// 注册所有平台适配器
registry.register(claudeAdapter);
registry.register(kimiAdapter);
registry.register(openclawAdapter);
registry.register(qclawAdapter);
registry.register(workbuddyAdapter);
registry.register(maxclawAdapter);
registry.register(duclawAdapter);
registry.register(autoclawAdapter);
registry.register(arkclawAdapter);
registry.register(claw360Adapter);
registry.register(easyclawAdapter);
