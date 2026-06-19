import {
  PlatformAdapter,
  MigrationCategory,
  FieldMappingTable,
  ParseResult,
  ParseWarning,
} from './types';

export class AdapterRegistry {
  private adapters: Map<string, PlatformAdapter> = new Map();

  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.id)) {
      console.warn('Adapter "' + adapter.id + '" is already registered, overwriting.');
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(platformId: string): PlatformAdapter | undefined {
    return this.adapters.get(platformId);
  }

  getAll(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  getByCategory(category: MigrationCategory): PlatformAdapter[] {
    return this.getAll().filter(
      (adapter) =>
        adapter.supportedExportCategories.includes(category) ||
        adapter.supportedImportCategories.includes(category)
    );
  }

  getSupportedSourcePlatforms(): PlatformAdapter[] {
    return this.getAll().filter(
      (adapter) => adapter.supportedExportCategories.length > 0
    );
  }

  getSupportedTargetPlatforms(): PlatformAdapter[] {
    return this.getAll().filter(
      (adapter) => adapter.supportedImportCategories.length > 0
    );
  }

  getFieldMappingBetween(
    sourceId: string,
    targetId: string
  ): { source: FieldMappingTable; target: FieldMappingTable } | null {
    const source = this.adapters.get(sourceId);
    const target = this.adapters.get(targetId);
    if (!source || !target) return null;
    return {
      source: source.getFieldMapping(),
      target: target.getFieldMapping(),
    };
  }

  parse(
    platformId: string,
    rawData: string
  ): { success: boolean; error?: string; schema?: unknown; warnings: ParseWarning[] } {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      return {
        success: false,
        error: 'Adapter for platform "' + platformId + '" not found.',
        warnings: [],
      };
    }

    const result: ParseResult = adapter.parseExportResult(rawData);
    return {
      success: result.success,
      error: result.errors.length > 0 ? result.errors[0].message : undefined,
      schema: result.data,
      warnings: result.warnings,
    };
  }
}

export const registry = new AdapterRegistry();