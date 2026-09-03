import { useEffect, useRef, useState } from 'react';
import { Play, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { starParts, cleanText, displayTitle } from '../lib/format.js';

const INTERVAL_MS = 7000;

export default function Hero({ items, onOpen, onSave, isSaved }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { setI(0); }, [items]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, items.length]);

  // Left/right arrow keys step through the carousel — skipped while typing
  // anywhere (arrow keys move the text cursor there instead).
  useEffect(() => {
    if (items.length < 2) return undefined;
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      setI((current) => ((current + dir) % items.length + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  // Feeds the dark-mode ambient glow (see body::before in index.css) with
  // whatever's currently showing — AniList's own precomputed dominant
  // color, no image analysis needed. No-ops harmlessly in light mode,
  // where that rule is hidden.
  useEffect(() => {
    const color = items[i]?.coverImage?.color;
    document.documentElement.style.setProperty('--hero-glow', color || '');
    return () => document.documentElement.style.removeProperty('--hero-glow');
  }, [items, i]);

  if (!items.length) return null;

  const media = items[i];
  const title = displayTitle(media);
  const stars = starParts(media.averageScore);
  const synopsis = cleanText(media.description);
  const saved = isSaved?.(media.id);
  const go = (n) => setI(((n % items.length) + items.length) % items.length);

  return (
    <div className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {items.map((m, idx) => (
        <div
          key={m.id}
          className={`hero-slide${idx === i ? ' active' : ''}`}
          style={{
            '--bg-wide': `url(${m.bannerImage || m.coverImage.extraLarge || m.coverImage.large})`,
            '--bg-tall': `url(${m.coverImage.extraLarge || m.coverImage.large})`,
          }}
          aria-hidden={idx !== i}
        />
      ))}
      <div className="hero-scrim" />

      <div className="hero-body">
        <p className="mono hero-eyebrow">Featured today</p>
        <h2 className="display hero-title">{title}</h2>
        <div className="hero-meta">
          {stars && <span className="stars">{stars.glyphs}</span>}
          {media.seasonYear && <span className="num">{media.seasonYear}</span>}
          {media.episodes && <span className="num">{media.episodes} episodes</span>}
        </div>
        {synopsis && (
          <p className="hero-synopsis">
            {synopsis.length > 220 ? `${synopsis.slice(0, 220)}…` : synopsis}
          </p>
        )}
        <div className="hero-actions">
          <button className="btn" onClick={() => onOpen(media)}>
            <Play size={15} fill="currentColor" /> View details
          </button>
          {onSave && (
            <button className="btn ghost" onClick={() => onSave(media)}>
              {saved ? <><Check size={15} /> Saved</> : <><Plus size={15} /> Want to watch</>}
            </button>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button className="hero-nav prev" onClick={() => go(i - 1)} aria-label="Previous featured title">
            <ChevronLeft size={20} />
          </button>
          <button className="hero-nav next" onClick={() => go(i + 1)} aria-label="Next featured title">
            <ChevronRight size={20} />
          </button>

          <div className="hero-dots" role="tablist" aria-label="Featured titles">
            {items.map((m, idx) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={idx === i}
                aria-label={`Show ${displayTitle(m)}`}
                className={idx === i ? 'active' : ''}
                onClick={() => go(idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
