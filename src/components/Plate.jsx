import { useState } from 'react';
import { Bookmark, Clock } from 'lucide-react';
import { starParts, displayTitle, cleanText } from '../lib/format.js';
import { formatAiring } from '../lib/airing.js';
import { useInView } from '../hooks/useInView.js';

/** One anime as a poster card. `rank` is only passed for ranked AI results. */
export default function Plate({ media, rank, index = 0, caption, saved, onOpen, onSave }) {
  const [loaded, setLoaded] = useState(false);
  const [ref, inView] = useInView();
  const title = displayTitle(media);
  const stars = starParts(media.averageScore);
  const excerpt = !caption && media.description ? cleanText(media.description) : '';

  return (
    <div ref={ref} className={`plate${inView ? ' revealed' : ''}`} style={{ '--i': index % 12 }}>
      <div className="cover-wrap">
        <button
          className="imgbox"
          onClick={(e) => onOpen(media, e.currentTarget.getBoundingClientRect())}
          aria-label={`Open details for ${title}`}
        >
          <img
            src={media.coverImage.large}
            alt={`Cover art for ${title}`}
            loading="lazy"
            className={loaded ? 'in' : ''}
            onLoad={() => setLoaded(true)}
          />
          {excerpt && (
            <span className="hover-note" aria-hidden="true">
              {excerpt.length > 130 ? `${excerpt.slice(0, 130)}…` : excerpt}
            </span>
          )}
        </button>

        {rank != null && <span className="rank">{String(rank + 1).padStart(2, '0')}</span>}

        {media.nextAiringEpisode && (
          <span className="next-ep">
            <Clock size={10} strokeWidth={2.5} />
            Ep {media.nextAiringEpisode.episode} · {formatAiring(media.nextAiringEpisode.airingAt)}
          </span>
        )}

        {media.watchStatus === 'watching' && media.progress > 0 && (
          <span className="progress-badge">
            Ep {media.progress}{media.episodes ? `/${media.episodes}` : ''}
          </span>
        )}

        <button
          className={`save${saved ? ' on' : ''}`}
          onClick={() => onSave(media)}
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} want-to-watch`}
        >
          <Bookmark size={14} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div>
        <h4>{title}</h4>
        {media.title.native && <div className="native">{media.title.native}</div>}
      </div>

      <div className="meta">
        {stars ? (
          <>
            <span className="stars" title={`${stars.raw}/100`}>{stars.glyphs}</span>
            <span className="num">{stars.value}</span>
          </>
        ) : (
          <span className="num">unrated</span>
        )}
        <span className="num">
          {media.episodes ? `${media.episodes} ep` : (media.format || '').replace('_', ' ')}
        </span>
        {media.seasonYear && <span className="num">{media.seasonYear}</span>}
      </div>

      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}
