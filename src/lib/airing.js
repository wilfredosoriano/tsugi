/** Turns an AniList airingAt unix timestamp into a short relative label. */
export function formatAiring(airingAt) {
  const ms = airingAt * 1000 - Date.now();
  if (ms <= 0) return 'today';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `in ${days}d`;
  const weeks = Math.round(days / 7);
  return `in ${weeks}w`;
}
