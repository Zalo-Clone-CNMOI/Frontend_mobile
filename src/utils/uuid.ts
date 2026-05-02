/**
 * UUID utility functions
 */

/**
 * Generate UUID v4 for local message IDs
 * Uses crypto.randomUUID if available, falls back to manual generation
 */
export function generateUUID(): string {
  try {
    if (typeof globalThis?.crypto?.randomUUID === "function")
      return (globalThis.crypto as any).randomUUID();
  } catch {
    // Fallback to manual generation
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
