/**
 * Generate initials from a name
 * Takes the first letter of each word (e.g., "Nguyen Van A" → "NVA")
 * @param name - The full name
 * @param maxInitials - Maximum number of initials to return (default: 2)
 * @returns Initials string
 */
export const getInitials = (name: string, maxInitials: number = 2): string => {
  if (!name || typeof name !== 'string') {
    return '?';
  }

  const words = name.trim().split(/\s+/);
  const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
  
  // Limit to maxInitials (usually 2 for better display)
  return initials.slice(0, maxInitials);
};

/**
 * Generate a consistent color based on a string (e.g., name or id)
 * Uses a hash function to map string to a color
 * @param str - String to hash
 * @returns Hex color string
 */
export const stringToColor = (str: string): string => {
  if (!str) return '#6366f1'; // Default indigo color

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a pleasing color (avoid too dark or too light)
  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return hslToHex(hue, saturation, lightness);
};

/**
 * Convert HSL to Hex color
 */
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Get avatar color based on name
 * @param name - User name
 * @returns Hex color string
 */
export const getAvatarColor = (name: string): string => {
  return stringToColor(name);
};
