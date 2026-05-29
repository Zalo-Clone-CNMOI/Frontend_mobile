export const ENTITY_COLORS: Record<string, string> = {
  person: '#007AFF',
  location: '#34C759',
  company: '#FF9500',
  product: '#AF52DE',
  concept: '#5856D6',
  tool: '#FF2D55',
  other: '#8E8E93',
};

export function getEntityColor(type: string): string {
  return ENTITY_COLORS[type] || ENTITY_COLORS.other;
}