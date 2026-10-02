import { starParts } from '../lib/format.js';

const STAR_PATH = 'M12 2.8l2.78 5.9 6.42.8-4.72 4.4 1.24 6.4L12 17.1l-5.72 3.2 1.24-6.4-4.72-4.4 6.42-.8L12 2.8z';

/**
 * Five SVG stars from an AniList 0–100 score, with a real clipped half star
 * (the old text glyph rendered as a striped box at small sizes). The same
 * full/half rule as starParts, so the figure next to it always agrees.
 */
export default function Stars({ score, className = '' }) {
  const parts = starParts(score);
  if (!parts) return null;
  const full = Math.floor(Number(parts.value));
  const half = Number(parts.value) - full >= 0.5;

  return (
    <span className={`stars ${className}`} role="img" aria-label={`${parts.value} out of 5 stars`} title={`${parts.raw}/100`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = i < full ? 100 : i === full && half ? 50 : 0;
        return (
          <span className="star" key={i} aria-hidden="true">
            <svg viewBox="0 0 24 24" className="star-bg"><path d={STAR_PATH} /></svg>
            {fill > 0 && (
              <svg viewBox="0 0 24 24" className="star-fill" style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}>
                <path d={STAR_PATH} />
              </svg>
            )}
          </span>
        );
      })}
    </span>
  );
}
