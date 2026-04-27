import type { TFunction } from 'i18next';

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp: number, t: TFunction): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return t('timeAgo.days', { count: days });
  if (hours > 0) return t('timeAgo.hours', { count: hours });
  if (minutes > 0) return t('timeAgo.minutes', { count: minutes });
  return t('timeAgo.justNow');
};

/**
 * Format a timestamp to relative time with fallback
 */
export const formatTimeAgoSafe = (
  timestamp: number | string | undefined,
  t: TFunction
): string => {
  if (!timestamp) return t('timeAgo.justNow');
  
  const num = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(num)) return t('timeAgo.justNow');
  
  return formatTimeAgo(num, t);
};
