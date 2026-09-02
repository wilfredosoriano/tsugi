/**
 * Caches "Because you saved X" AI results per reference title, so revisiting
 * the same seed (e.g. a random re-pick landing on a title we've already
 * ranked for) doesn't re-hit AniList + the AI on every load. Entries are
 * pruned whenever a title drops out of the want-to-watch list — there's no
 * reason to keep a recommendation around for something no longer saved.
 */

const KEY = 'tsugi:becauseSavedCache';

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // quota or private mode — cache just won't persist this session
  }
}

export function getCachedRecommendation(referenceId) {
  return readCache()[referenceId] ?? null;
}

export function setCachedRecommendation(referenceId, result) {
  const cache = readCache();
  cache[referenceId] = result;
  writeCache(cache);
}

/** Drops any cached entry whose title is no longer in the saved list. */
export function pruneBecauseSavedCache(validIds) {
  const cache = readCache();
  const valid = new Set(validIds);
  let changed = false;
  for (const key of Object.keys(cache)) {
    if (!valid.has(Number(key))) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
}
