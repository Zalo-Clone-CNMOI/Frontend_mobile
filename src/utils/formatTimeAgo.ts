export function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / (1000 * 60));

  if (mins < 60) return `${mins} phút`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;

  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}
