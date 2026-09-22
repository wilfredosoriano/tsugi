import {
  Swords, Compass, Laugh, Drama, Sparkles, Rocket, Heart, Coffee, Zap, Search,
  Brain, Ghost, Trophy, Music, Skull, Bot, Flame, Star, Moon, Flower2,
  DoorOpen, RefreshCw, RotateCcw, Radiation, Building2, Wand2, GraduationCap,
  Sunrise, Tent, Users, Shield, Hand, Tags,
} from 'lucide-react';

/** One icon + accent color per genre/demographic/tag-genre, for the picker's tiles. */
export const GENRE_STYLE = {
  Action: { icon: Swords, color: '#ef4444' },
  Adventure: { icon: Compass, color: '#f97316' },
  Comedy: { icon: Laugh, color: '#eab308' },
  Drama: { icon: Drama, color: '#ec4899' },
  Fantasy: { icon: Sparkles, color: '#8b5cf6' },
  'Sci-Fi': { icon: Rocket, color: '#06b6d4' },
  Romance: { icon: Heart, color: '#f43f5e' },
  'Slice of Life': { icon: Coffee, color: '#d97706' },
  Thriller: { icon: Zap, color: '#6366f1' },
  Mystery: { icon: Search, color: '#64748b' },
  Psychological: { icon: Brain, color: '#a855f7' },
  Supernatural: { icon: Ghost, color: '#14b8a6' },
  Sports: { icon: Trophy, color: '#22c55e' },
  Music: { icon: Music, color: '#d946ef' },
  Horror: { icon: Skull, color: '#b91c1c' },
  Mecha: { icon: Bot, color: '#3b82f6' },
  Shounen: { icon: Flame, color: '#ea580c' },
  Shoujo: { icon: Star, color: '#f472b6' },
  Seinen: { icon: Moon, color: '#475569' },
  Josei: { icon: Flower2, color: '#fb7185' },
  Isekai: { icon: DoorOpen, color: '#10b981' },
  Reincarnation: { icon: RefreshCw, color: '#84cc16' },
  'Super Power': { icon: Zap, color: '#facc15' },
  'Time Loop': { icon: RotateCcw, color: '#0ea5e9' },
  'Post-Apocalyptic': { icon: Radiation, color: '#78716c' },
  'Urban Fantasy': { icon: Building2, color: '#7c3aed' },
  Magic: { icon: Wand2, color: '#c026d3' },
  School: { icon: GraduationCap, color: '#60a5fa' },
  'Coming of Age': { icon: Sunrise, color: '#fbbf24' },
  Survival: { icon: Tent, color: '#16a34a' },
  'Female Harem': { icon: Users, color: '#db2777' },
  Military: { icon: Shield, color: '#65a30d' },
  'Martial Arts': { icon: Hand, color: '#dc2626' },
};

/** Falls back to a plain tag icon for anything not explicitly styled above. */
export const DEFAULT_GENRE_STYLE = { icon: Tags, color: '#71717a' };

export function genreStyle(name) {
  return GENRE_STYLE[name] || DEFAULT_GENRE_STYLE;
}
