"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
const registry_1 = require("./core/registry");
var registry_2 = require("./core/registry");
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return registry_2.registry; } });
__exportStar(require("./core/types"), exports);
__exportStar(require("./core/mapper"), exports);
const claude_1 = require("./platforms/claude");
const kimi_1 = require("./platforms/kimi");
const openclaw_1 = require("./platforms/openclaw");
const qclaw_1 = require("./platforms/qclaw");
const workbuddy_1 = require("./platforms/workbuddy");
const maxclaw_1 = require("./platforms/maxclaw");
const duclaw_1 = require("./platforms/duclaw");
const autoclw_1 = require("./platforms/autoclw");
const arkclaw_1 = require("./platforms/arkclaw");
const claw360_1 = require("./platforms/claw360");
const easyclaw_1 = require("./platforms/easyclaw");
// 注册所有平台适配器
registry_1.registry.register(claude_1.claudeAdapter);
registry_1.registry.register(kimi_1.kimiAdapter);
registry_1.registry.register(openclaw_1.openclawAdapter);
registry_1.registry.register(qclaw_1.qclawAdapter);
registry_1.registry.register(workbuddy_1.workbuddyAdapter);
registry_1.registry.register(maxclaw_1.maxclawAdapter);
registry_1.registry.register(duclaw_1.duclawAdapter);
registry_1.registry.register(autoclw_1.autoclawAdapter);
registry_1.registry.register(arkclaw_1.arkclawAdapter);
registry_1.registry.register(claw360_1.claw360Adapter);
registry_1.registry.register(easyclaw_1.easyclawAdapter);
