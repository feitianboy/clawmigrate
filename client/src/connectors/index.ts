export * from './types';
export * from './registry';

export { claudeConnector } from './platforms/claude';
export { kimiConnector } from './platforms/kimi';
export { openclawConnector } from './platforms/openclaw';

import { connectorRegistry } from './registry';
import { claudeConnector } from './platforms/claude';
import { kimiConnector } from './platforms/kimi';
import { openclawConnector } from './platforms/openclaw';

connectorRegistry.register(claudeConnector);
connectorRegistry.register(kimiConnector);
connectorRegistry.register(openclawConnector);

export default connectorRegistry;
