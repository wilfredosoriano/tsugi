import { useState } from 'react';
import { Bookmark, Clock, Star } from 'lucide-react';
import { starParts, displayTitle, cleanText } from '../lib/format.js';
import { formatAiring } from '../lib/airing.js';
import { useInView } from '../hooks/useInView.js';
import Stars from './Stars.jsx';

/** One anime as a poster card. */
export default function Plate({ media, index = 0, saved, onOpen, onSave }) {
  const [loaded, setLoaded] = useState(false);
  const [ref, inView] = useInView();
  const title = displayTitle(media);
  const stars = starParts(media.averageScore);
  const excerpt = media.description ? cleanText(media.description) : '';

  return (
    <div
      ref={ref}
      className={`plate${inView ? ' revealed' : ''}`}
      style={{ '--i': index % 12, '--tilt': index % 2 ? '1.5deg' : '-1.5deg' }}
    >
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

        <div className="plate-gradient">
          <h4>{title}</h4>
          {media.title.native && <div className="native">{media.title.native}</div>}
        </div>

        {stars && (
          <span className="score" title={`${stars.raw}/100`}>
            <Star size={12} strokeWidth={2.5} fill="currentColor" aria-hidden="true" /> {stars.value}
          </span>
        )}

        <button
          className={`save${saved ? ' on' : ''}`}
          onClick={() => onSave(media)}
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} want-to-watch`}
        >
          <Bookmark size={16} strokeWidth={2.5} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="plate-info">
        {(media.nextAiringEpisode || (media.watchStatus === 'watching' && media.progress > 0)) && (
          <div className="plate-badges">
            {media.nextAiringEpisode && (
              <span className="badge next-ep">
                <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
                Ep {media.nextAiringEpisode.episode} · {formatAiring(media.nextAiringEpisode.airingAt)}
              </span>
            )}
            {media.watchStatus === 'watching' && media.progress > 0 && (
              <span className="badge progress-badge">
                Ep {media.progress}{media.episodes ? `/${media.episodes}` : ''}
              </span>
            )}
          </div>
        )}
        <div className="meta">
          {stars ? <Stars score={media.averageScore} /> : <span className="num">unrated</span>}
          <span className="num">
            {media.episodes ? `${media.episodes} ep` : (media.format || '').replace('_', ' ')}
          </span>
          {media.seasonYear && <span className="num">{media.seasonYear}</span>}
        </div>
      </div>
    </div>
  );
}
