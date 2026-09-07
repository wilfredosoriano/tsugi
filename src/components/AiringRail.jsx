import { Clock } from 'lucide-react';
import { displayTitle } from '../lib/format.js';
import { formatAiring } from '../lib/airing.js';

/**
 * Homepage rail of episodes airing soon — a flat list of {media, episode,
 * airingAt} (from fetchAiringSoon), not bare media objects, so it gets its
 * own compact card instead of reusing Plate/Grid.
 */
export default function AiringRail({ items, onOpen }) {
  return (
    <div className="airing-scroll-rail">
      {items.map(({ media, episode, airingAt }) => (
        <button
          key={media.id}
          className="airing-item"
          onClick={(e) => onOpen(media, e.currentTarget.getBoundingClientRect())}
        >
          <img src={media.coverImage.large} alt="" loading="lazy" />
          <div>
            <h4>{displayTitle(media)}</h4>
            <span className="airing-badge">
              <Clock size={11} strokeWidth={2.5} />
              Ep {episode} · {formatAiring(airingAt)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
