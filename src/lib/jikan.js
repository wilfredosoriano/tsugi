/**
 * Jikan — unofficial MyAnimeList API wrapper. Free, no key, CORS-enabled.
 * Episode titles/air dates only — no streaming/video links of any kind.
 * Docs: https://docs.api.jikan.moe/
 */

const ENDPOINT = 'https://api.jikan.moe/v4';
const MAX_PAGES = 4; // 25/page — covers up to 100 episodes, plenty for a scrollable list

/** Per-episode titles/air dates for a title, looked up by its MyAnimeList id (AniList's `idMal`). */
export async function fetchEpisodesByMalId(malId) {
  if (!malId) return [];

  const episodes = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= MAX_PAGES) {
    const res = await fetch(`${ENDPOINT}/anime/${malId}/episodes?page=${page}`);
    if (!res.ok) break;
    const json = await res.json();
    episodes.push(...(json.data || []));
    hasNextPage = Boolean(json.pagination?.has_next_page);
    page += 1;
  }

  return episodes.map((ep) => ({
    number: ep.mal_id,
    title: ep.title,
    titleJapanese: ep.title_japanese,
    aired: ep.aired,
    filler: ep.filler,
    recap: ep.recap,
  }));
}
