/**
 * A saved item's own watch-progress status — distinct from AniList's
 * `media.status` (RELEASING/FINISHED/etc, the show's own release state).
 * Stored as `watchStatus` on each item in useSaved's list.
 */
export const WATCH_STATUSES = [
  { value: 'planning', label: 'Planning', emoji: '📌' },
  { value: 'watching', label: 'Watching', emoji: '👀' },
  { value: 'completed', label: 'Completed', emoji: '✅' },
];

export const DEFAULT_WATCH_STATUS = 'planning';
