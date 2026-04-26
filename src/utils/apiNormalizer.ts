/**
 * Utility to normalize API responses from snake_case to camelCase
 * This centralizes the field name conversion so DTOs only need camelCase
 */

type SnakeToCamel<S extends string> = S extends `${infer P}_${infer Q}`
  ? `${P}${Capitalize<SnakeToCamel<Q>>}`
  : S;

// Type to convert all snake_case keys in an object to camelCase
type Camelize<T> = T extends Array<infer U>
  ? Array<Camelize<U>>
  : T extends object
    ? { [K in keyof T as K extends string ? SnakeToCamel<K> : K]: Camelize<T[K]> }
    : T;

/**
 * Convert a single snake_case string to camelCase
 */
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Recursively convert all object keys from snake_case to camelCase
 */
export const normalizeKeys = <T extends Record<string, any>>(obj: T): Camelize<T> => {
  if (obj === null || typeof obj !== 'object') {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeys(item)) as any;
  }

  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    normalized[camelKey] =
      value !== null && typeof value === 'object' && !(value instanceof Date)
        ? normalizeKeys(value)
        : value;
  }
  return normalized as Camelize<T>;
};

/**
 * Normalize API list response - handles different response shapes
 */
export const normalizeListResponse = <T>(
  response: any,
  itemNormalizer?: (item: any) => T,
): { items: T[]; total?: number; hasMore?: boolean; nextCursor?: string | null } => {
  if (!response) {
    return { items: [] };
  }

  // Get the raw items array from various possible response shapes
  const rawItems = Array.isArray(response)
    ? response
    : response.items || response.data || response.messages || response.conversations || [];

  // Normalize items
  const items = itemNormalizer
    ? rawItems.map(itemNormalizer)
    : rawItems.map((item: any) => normalizeKeys(item));

  return {
    items,
    total: response.total ?? response.meta?.total,
    hasMore: response.hasMore ?? response.meta?.hasMore,
    nextCursor: response.nextCursor ?? response.meta?.nextCursor ?? null,
  };
};

/**
 * Normalize single item response
 */
export const normalizeItemResponse = <T>(response: any, normalizer?: (item: any) => T): T | null => {
  if (!response) return null;

  const data = response.data ?? response;
  if (!data) return null;

  return normalizer ? normalizer(data) : normalizeKeys(data);
};
