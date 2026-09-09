/**
 * AniList GraphQL client.
 * Free, no API key, CORS-enabled — safe to call straight from the browser.
 * Docs: https://docs.anilist.co
 */

const ENDPOINT = 'https://graphql.anilist.co';

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  averageScore
  popularity
  episodes
  duration
  seasonYear
  format
  status
  isAdult
  genres
  siteUrl
  description(asHtml: false)
  studios(isMain: true) { nodes { name } }
  externalLinks { site url }
  trailer { id site }
  nextAiringEpisode { airingAt episode }
`;

/**
 * Bolted onto MEDIA_FIELDS only where the AI recommendation pool is built —
 * lets isSequel() below tell a franchise's season 1 apart from its sequels,
 * so the recommender never surfaces "Season 3" as if it were a fresh pick.
 */
const RELATION_CHECK_FIELDS = `
  relations {
    edges {
      relationType(version: 2)
      node { id type }
    }
  }
`;

/** True when something else in the franchise is meant to be watched first. */
function isSequel(m) {
  return (m.relations?.edges || []).some(
    (e) => e.relationType === 'PREQUEL' && e.node?.type === 'ANIME'
  );
}

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Romance',
  'Slice of Life', 'Thriller', 'Mystery', 'Psychological', 'Supernatural',
  'Sports', 'Music', 'Horror', 'Mecha',
];

/**
 * Shounen/Shoujo/Seinen/Josei aren't genres in AniList's schema — they're
 * audience-demographic tags — so filtering by one needs the `tag` query
 * argument instead of `genre`. Kept as a separate list so callers know
 * which argument to send.
 */
export const DEMOGRAPHICS = ['Shounen', 'Shoujo', 'Seinen', 'Josei'];

/**
 * Popular tag-only genres with no equivalent in AniList's fixed `genre`
 * enum — same "needs `tag` not `genre`" situation as DEMOGRAPHICS above,
 * just not audience-related. Picked from the most common tags across
 * AniList's most popular titles.
 */
export const TAG_GENRES = [
  'Isekai', 'Reincarnation', 'Super Power', 'Time Loop', 'Post-Apocalyptic',
  'Urban Fantasy', 'Magic', 'School', 'Coming of Age', 'Survival', 'Female Harem', 'Military', 'Martial Arts',
];

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    throw new Error('Too many requests right now. Please wait a moment and try again.');
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const hasCover = (m) => m && m.coverImage?.large;

export const SORTS = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'SCORE_DESC', label: 'Top rated' },
  { value: 'POPULARITY_DESC', label: 'Most popular' },
  { value: 'START_DATE_DESC', label: 'Newest' },
];

/** Trending, genre/demographic-filtered, or search results for the main grid. Paginated. */
export async function fetchGrid({ genre = null, search = null, sort = null, page = 1 } = {}) {
  const filterField = genre && (DEMOGRAPHICS.includes(genre) || TAG_GENRES.includes(genre)) ? 'tag' : 'genre';
  const query = `query ($filterValue: String, $search: String, $sort: [MediaSort], $page: Int) {
    Page(page: $page, perPage: 24) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, ${filterField}: $filterValue, search: $search, sort: $sort) {
        ${MEDIA_FIELDS}
      }
    }
  }`;

  const effectiveSort = search ? ['SEARCH_MATCH'] : [sort || (genre ? 'SCORE_DESC' : 'TRENDING_DESC')];
  const data = await gql(query, { filterValue: genre, search, sort: effectiveSort, page });
  return {
    items: data.Page.media.filter(hasCover),
    hasNextPage: Boolean(data.Page.pageInfo?.hasNextPage),
  };
}

/** Fast, lightweight lookup for the live search dropdown — small payload, small pool. */
export async function quickSearch(term) {
  const data = await gql(
    `query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          coverImage { medium }
          averageScore
          seasonYear
          format
        }
      }
    }`,
    { search: term }
  );
  return data.Page.media.filter((m) => m && m.coverImage?.medium);
}

/** Full record for a single title, e.g. opening a live-search suggestion. */
export async function fetchById(id) {
  const data = await gql(
    `query ($id: Int) {
      Media(id: $id) { ${MEDIA_FIELDS} }
    }`,
    { id }
  );
  return data.Media;
}

const RELATION_LABELS = {
  PREQUEL: 'Prequel',
  SEQUEL: 'Sequel',
  SIDE_STORY: 'Side story',
  PARENT: 'Parent story',
  ALTERNATIVE: 'Alternative',
  SPIN_OFF: 'Spin-off',
  SUMMARY: 'Summary',
  FULL_STORY: 'Full story',
  COMPILATION: 'Compilation',
  CONTAINS: 'Contains',
};

/**
 * Real, curated season/continuity links (sequel, prequel, side story, …) —
 * distinct from `recommendations`, which is just AniList's algorithmic
 * "people who liked this also liked" graph and says nothing about whether
 * a second season actually exists.
 */
export async function fetchRelations(id) {
  const data = await gql(
    `query ($id: Int) {
      Media(id: $id) {
        relations {
          edges {
            relationType(version: 2)
            node { type ${MEDIA_FIELDS} }
          }
        }
      }
    }`,
    { id }
  );

  return (data.Media.relations.edges || [])
    .filter((e) => e.node.type === 'ANIME' && hasCover(e.node) && RELATION_LABELS[e.relationType])
    .map((e) => ({ label: RELATION_LABELS[e.relationType], media: e.node }));
}

/** AniList's own curated "if you liked this" graph, for the detail sheet. */
export async function fetchRecommendations(id) {
  const data = await gql(
    `query ($id: Int) {
      Media(id: $id) {
        recommendations(sort: RATING_DESC, perPage: 8) {
          nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
        }
      }
    }`,
    { id }
  );
  return (data.Media.recommendations.nodes || [])
    .map((n) => n.mediaRecommendation)
    .filter(hasCover);
}

/**
 * Pull the title a question refers to ("similar to Black Clover" → Black Clover)
 * and confirm it actually exists in the catalog.
 */
async function findReference(question) {
  const match = question.match(
    /(?:like|similar to|resembles|reminds me of|in the vein of)\s+([\p{L}\p{N}:'’!.\-\s]{3,60})/iu
  );
  if (!match) return null;

  const guess = match[1]
    .replace(/\b(but|with|and|that|which|though|except|however|only|without)\b[\s\S]*$/i, '')
    .replace(/[.,!?;]+$/, '')
    .trim();

  if (guess.length < 3) return null;

  try {
    const data = await gql(
      `query ($s: String) {
        Media(search: $s, type: ANIME, isAdult: false) { id title { romaji english } }
      }`,
      { s: guess }
    );
    return data.Media || null;
  } catch {
    return null; // no reference is fine, we fall through to a broad pool
  }
}

/**
 * A pool of high scorers, used whenever a reference-driven pool comes back
 * thin. AniList's top-scored list skews heavily toward a franchise's later,
 * best-reviewed seasons (only its most invested fans tend to rate the
 * finale) — after isSequel() filters those out, one page of 40 often
 * collapses to under 10 real candidates, so this pages through a few more
 * until there's a decent-sized pool of genuinely standalone/first entries.
 */
async function broadPool() {
  const pool = new Map();
  for (let page = 1; page <= 3 && pool.size < 30; page++) {
    const data = await gql(
      `query ($page: Int) {
        Page(page: $page, perPage: 40) {
          media(type: ANIME, isAdult: false, sort: SCORE_DESC) { ${MEDIA_FIELDS} ${RELATION_CHECK_FIELDS} }
        }
      }`,
      { page }
    );
    for (const m of data.Page.media) {
      if (hasCover(m) && !isSequel(m)) pool.set(m.id, m);
    }
  }
  return [...pool.values()];
}

/**
 * The grounding step. Builds a pool of real catalog entries BEFORE the model
 * sees anything, from two sources in order of specificity:
 *   1. the reference title's own curated recommendation graph
 *   2. high scorers sharing the reference's strongest tags
 * Sequels/later seasons are filtered out here rather than left for the model
 * to catch — a title that's clearly "Season 3" by name is easy to spot, but
 * plenty of sequels don't say so in the title at all, so this leans on
 * AniList's own relation graph instead of a naming guess.
 */
async function poolFromReference(referenceId) {
  const pool = new Map();
  const data = await gql(
    `query ($id: Int) {
      Media(id: $id) {
        tags { name rank }
        recommendations(sort: RATING_DESC, perPage: 24) {
          nodes { mediaRecommendation { ${MEDIA_FIELDS} ${RELATION_CHECK_FIELDS} } }
        }
      }
    }`,
    { id: referenceId }
  );

  for (const node of data.Media.recommendations.nodes || []) {
    const m = node.mediaRecommendation;
    if (hasCover(m) && m.id !== referenceId && !isSequel(m)) pool.set(m.id, m);
  }

  const tags = (data.Media.tags || [])
    .filter((t) => t.rank >= 70)
    .slice(0, 4)
    .map((t) => t.name);

  if (tags.length) {
    const widened = await gql(
      `query ($tags: [String]) {
        Page(page: 1, perPage: 24) {
          media(type: ANIME, isAdult: false, tag_in: $tags, sort: SCORE_DESC) {
            ${MEDIA_FIELDS} ${RELATION_CHECK_FIELDS}
          }
        }
      }`,
      { tags }
    );
    for (const m of widened.Page.media) {
      if (hasCover(m) && m.id !== referenceId && !isSequel(m)) pool.set(m.id, m);
    }
  }

  return pool;
}

/** Grounds a natural-language question ("similar to X") in the real catalog. */
export async function fetchCandidates(question) {
  const reference = await findReference(question);
  const pool = reference ? await poolFromReference(reference.id) : new Map();

  if (pool.size < 14) {
    for (const m of await broadPool()) pool.set(m.id, m);
  }

  return { reference, pool: [...pool.values()].slice(0, 40) };
}

/**
 * Same grounding step, seeded directly by a known title instead of parsing
 * one out of a question — used to personalize a row off something the user
 * already saved, with no NL question involved.
 */
export async function fetchCandidatesForMedia(reference) {
  const pool = await poolFromReference(reference.id);

  if (pool.size < 14) {
    for (const m of await broadPool()) pool.set(m.id, m);
  }

  return { reference, pool: [...pool.values()].slice(0, 40) };
}

/**
 * A pool of well-known, banner-image-having titles to draw the homepage
 * hero from. Popularity-sorted so the pool stays full of titles worth
 * spotlighting even after filtering out ones AniList has no banner art for.
 */
export async function fetchFeaturedPool() {
  const data = await gql(
    `query {
      Page(page: 1, perPage: 30) {
        media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }`
  );
  return data.Page.media.filter((m) => hasCover(m) && m.bannerImage);
}

/**
 * Episodes airing soon, across ongoing (or about-to-premiere) anime, for
 * the homepage "Airing soon" rail — so users can see what's about to drop
 * without opening every ongoing title one by one. `airingSchedules` has
 * no per-media isAdult filter of its own, so that's applied client-side,
 * along with deduping (a title can appear once per upcoming episode).
 *
 * Sorting purely by airing time surfaces whatever happens to air in the
 * next hour regardless of how obscure it is, which reads as "random
 * anime" rather than "airing soon" the way other anime sites show it.
 * Instead this pulls a wider week-long window, keeps only the most
 * popular titles in it, and only then sorts that subset chronologically.
 */
export async function fetchAiringSoon(limit = 15) {
  const now = Math.floor(Date.now() / 1000);
  const soon = now + 60 * 60 * 24 * 7;
  const data = await gql(
    `query ($now: Int, $soon: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        airingSchedules(airingAt_greater: $now, airingAt_lesser: $soon, sort: TIME) {
          airingAt
          episode
          media { ${MEDIA_FIELDS} }
        }
      }
    }`,
    { now, soon, perPage: 100 }
  );

  const seen = new Set();
  const candidates = [];
  for (const s of data.Page.airingSchedules) {
    const m = s.media;
    if (!hasCover(m) || m.isAdult || seen.has(m.id)) continue;
    seen.add(m.id);
    candidates.push({ media: m, episode: s.episode, airingAt: s.airingAt });
  }

  return candidates
    .sort((a, b) => (b.media.popularity || 0) - (a.media.popularity || 0))
    .slice(0, limit)
    .sort((a, b) => a.airingAt - b.airingAt);
}

/**
 * Live next-episode airing info for a specific set of media (e.g. a
 * user's own Watching-status list), for the "Your shows airing soon"
 * rail — distinct from fetchAiringSoon's popularity-curated pool, since a
 * personally-tracked show may not be popular enough to land in that one.
 * Ignores titles with nothing currently scheduled (finished, hiatus, etc).
 */
export async function fetchAiringForIds(ids) {
  if (!ids.length) return [];
  const data = await gql(
    `query ($ids: [Int]) {
      Page(page: 1, perPage: ${ids.length}) {
        media(id_in: $ids) { ${MEDIA_FIELDS} }
      }
    }`,
    { ids }
  );
  return data.Page.media
    .filter((m) => m.nextAiringEpisode)
    .map((m) => ({ media: m, episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt }))
    .sort((a, b) => a.airingAt - b.airingAt);
}

/** Minimal shape sent to the ranking endpoint — no covers, no descriptions. */
export function toPromptRows(pool) {
  return pool.map((m) => ({
    id: m.id,
    title: m.title.english || m.title.romaji,
    genres: m.genres,
    episodes: m.episodes,
    duration: m.duration,
    format: m.format,
    score: m.averageScore,
  }));
}
