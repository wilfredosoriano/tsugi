/**
 * Per-genre flat chip color (a hue; the pastel lightness is fixed so dark ink
 * text always passes contrast) plus the Japanese name shown beside the label.
 */
const GENRES = {
  Action: { hue: 0, jp: 'アクション' },
  Adventure: { hue: 24, jp: '冒険' },
  Comedy: { hue: 50, jp: 'コメディ' },
  Drama: { hue: 330, jp: 'ドラマ' },
  Fantasy: { hue: 265, jp: 'ファンタジー' },
  'Sci-Fi': { hue: 187, jp: 'SF' },
  Romance: { hue: 350, jp: '恋愛' },
  'Slice of Life': { hue: 36, jp: '日常' },
  Thriller: { hue: 235, jp: 'スリラー' },
  Mystery: { hue: 215, jp: 'ミステリー' },
  Psychological: { hue: 285, jp: '心理' },
  Supernatural: { hue: 172, jp: '超常' },
  Sports: { hue: 140, jp: 'スポーツ' },
  Music: { hue: 300, jp: '音楽' },
  Horror: { hue: 8, jp: 'ホラー', sat: 65, light: 72 },
  Mecha: { hue: 205, jp: 'メカ' },
  Shounen: { hue: 16, jp: '少年' },
  Shoujo: { hue: 318, jp: '少女' },
  Seinen: { hue: 225, jp: '青年', sat: 55 },
  Josei: { hue: 342, jp: '女性' },
  Isekai: { hue: 155, jp: '異世界' },
  Reincarnation: { hue: 82, jp: '転生' },
  'Super Power': { hue: 56, jp: '超能力' },
  'Time Loop': { hue: 198, jp: 'タイムループ' },
  'Post-Apocalyptic': { hue: 30, jp: '終末', sat: 40 },
  'Urban Fantasy': { hue: 252, jp: '現代ファンタジー' },
  Magic: { hue: 292, jp: '魔法' },
  School: { hue: 210, jp: '学園' },
  'Coming of Age': { hue: 44, jp: '成長' },
  Survival: { hue: 125, jp: 'サバイバル' },
  'Female Harem': { hue: 335, jp: 'ハーレム' },
  Military: { hue: 92, jp: '軍事', sat: 55 },
  'Martial Arts': { hue: 4, jp: '武術', light: 76 },
};

/** { color, jp } for a genre; anything unlisted gets a neutral chip and no kana. */
export function genreChip(name) {
  const g = GENRES[name];
  if (!g) return { color: 'hsl(250 20% 82%)', jp: '' };
  return { color: `hsl(${g.hue} ${g.sat ?? 90}% ${g.light ?? 80}%)`, jp: g.jp };
}
