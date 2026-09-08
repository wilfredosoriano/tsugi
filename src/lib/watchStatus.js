/**
 * A saved item's own watch-progress status — distinct from AniList's
 * `media.status` (RELEASING/FINISHED/etc, the show's own release state).
 * Stored as `watchStatus` on each item in useSaved's list.
 */
export const WATCH_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
];

export const DEFAULT_WATCH_STATUS = 'planning';
