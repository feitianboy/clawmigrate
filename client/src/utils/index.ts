/**
 * ClawMigrate 通用工具函数
 */

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 截断文本
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * 从类数组对象创建数组
 */
export function toArray<T>(arrayLike: ArrayLike<T>): T[] {
  return Array.prototype.slice.call(arrayLike);
}

/**
 * 移除数组中的假值
 */
export function compact<T>(array: (T | false | null | undefined)[]): T[] {
  return array.filter(Boolean) as T[];
}

/**
 * 获取对象指定路径的值
 */
export function get<T = any>(obj: Record<string, any>, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result ?? defaultValue;
}

/**
 * 设置对象指定路径的值
 */
export function set(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((acc, key) => {
    if (acc[key] == null) acc[key] = {};
    return acc[key];
  }, obj);
  target[lastKey] = value;
  return obj;
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: Record<string, any>): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 合并对象
 */
export function merge<T extends Record<string, any>, U extends Record<string, any>>(
  target: T,
  source: U
): T & U {
  return { ...target, ...source };
}
