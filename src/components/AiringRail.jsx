import { Clock } from 'lucide-react';
import { displayTitle } from '../lib/format.js';
import { formatAiring } from '../lib/airing.js';

/**
 * Rail of episodes airing soon — a flat list of {media, episode, airingAt}
 * (from fetchAiringSoon), not bare media objects, so it gets its own
 * compact card instead of reusing Plate/Grid. `vertical` switches from the
 * horizontally-scrolling mobile rail to a stacked sidebar list (same cards
 * either way) — used for the desktop left-column placement.
 */
export default function AiringRail({ items, onOpen, vertical = false }) {
  return (
    <div className={vertical ? 'airing-list-vertical' : 'airing-scroll-rail'}>
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
