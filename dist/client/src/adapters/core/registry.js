"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = exports.AdapterRegistry = void 0;
class AdapterRegistry {
    constructor() {
        this.adapters = new Map();
    }
    register(adapter) {
        if (this.adapters.has(adapter.id)) {
            console.warn('Adapter "' + adapter.id + '" is already registered, overwriting.');
        }
        this.adapters.set(adapter.id, adapter);
    }
    get(platformId) {
        return this.adapters.get(platformId);
    }
    getAll() {
        return Array.from(this.adapters.values());
    }
    getByCategory(category) {
        return this.getAll().filter((adapter) => adapter.supportedExportCategories.includes(category) ||
            adapter.supportedImportCategories.includes(category));
    }
    getSupportedSourcePlatforms() {
        return this.getAll().filter((adapter) => adapter.supportedExportCategories.length > 0);
    }
    getSupportedTargetPlatforms() {
        return this.getAll().filter((adapter) => adapter.supportedImportCategories.length > 0);
    }
    getFieldMappingBetween(sourceId, targetId) {
        const source = this.adapters.get(sourceId);
        const target = this.adapters.get(targetId);
        if (!source || !target)
            return null;
        return {
            source: source.getFieldMapping(),
            target: target.getFieldMapping(),
        };
    }
    parse(platformId, rawData) {
        const adapter = this.adapters.get(platformId);
        if (!adapter) {
            return {
                success: false,
                error: 'Adapter for platform "' + platformId + '" not found.',
                warnings: [],
            };
        }
        const result = adapter.parseExportResult(rawData);
        return {
            success: result.success,
            error: result.errors.length > 0 ? result.errors[0].message : undefined,
            schema: result.data,
            warnings: result.warnings,
        };
    }
}
exports.AdapterRegistry = AdapterRegistry;
exports.registry = new AdapterRegistry();
