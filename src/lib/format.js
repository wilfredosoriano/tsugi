/** AniList scores are 0–100. Render them as five stars plus the exact figure. */
export function starParts(score) {
  if (!score) return null;
  const value = score / 20;
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return {
    glyphs: '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(5 - full - (half ? 1 : 0)),
    value: value.toFixed(1),
    raw: score,
  };
}

/** AniList descriptions carry inline HTML even with asHtml: false. */
export function cleanText(input) {
  return String(input ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Only surface links to platforms that legitimately license the show. */
const LEGAL_PLATFORMS =
  /crunchyroll|netflix|hidive|hulu|prime video|amazon|disney|muse|bilibili|ani-one|iq\.com|vrv|retrocrush/i;

export function legalLinks(media) {
  return (media.externalLinks || []).filter((l) => LEGAL_PLATFORMS.test(l.site));
}

/**
 * One-click "search this title" links for major legal platforms. These
 * always work — unlike AniList's externalLinks, which sometimes point to a
 * platform's homepage instead of the title itself, or are simply missing
 * for a given show.
 */
export const SEARCH_PLATFORMS = [
  { site: 'Crunchyroll', url: (q) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(q)}`, licensed: true },
  { site: 'Netflix', url: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`, licensed: true },
  { site: 'Prime Video', url: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`, licensed: true },
  // Not licensors — unofficial aggregators. Kept, but flagged and visually
  // separated (see DetailSheet's "unlicensed" group) rather than mixed in
  // with the platforms above as if they were equivalent.
  { site: 'Anime BD', url: (q) => `https://anibd.app/?s=${encodeURIComponent(q)}`, licensed: false },
  { site: 'Anikoto TV', url: (q) => `https://anikototv.to/filter?keyword=${encodeURIComponent(q)}`, licensed: false },
  { site: 'Anix TV', url: (q) => `https://anixtv.me/filter?keyword=${encodeURIComponent(q)}`, licensed: false },
  { site: 'Anime SOGO', url: (q) => `https://animesogo.to/filter?keyword=${encodeURIComponent(q)}`, licensed: false },
  { site: 'Anichi', url: (q) => `https://anichi.to/filter?keyword=${encodeURIComponent(q)}`, licensed: false },
];

export function searchLinks(title) {
  return SEARCH_PLATFORMS.map((p) => ({ site: p.site, url: p.url(title), licensed: p.licensed }));
}

export function displayTitle(media) {
  return media.title.english || media.title.romaji || 'Untitled';
}
