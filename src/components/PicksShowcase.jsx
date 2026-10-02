import { Bookmark, Check, Play } from 'lucide-react';
import { displayTitle, starParts } from '../lib/format.js';
import Stars from './Stars.jsx';
import { Grid } from './Grid.jsx';

const rankLabel = (i) => String(i + 1).padStart(2, '0');

function PickMeta({ media }) {
  const parts = starParts(media.averageScore);
  return (
    <div className="meta">
      {parts ? (
        <>
          <Stars score={media.averageScore} />
          <span className="num">{parts.value}</span>
        </>
      ) : (
        <span className="num">unrated</span>
      )}
      <span className="num">{media.episodes ? `${media.episodes} ep` : (media.format || '').replace('_', ' ')}</span>
      {media.seasonYear && <span className="num">{media.seasonYear}</span>}
    </div>
  );
}

function Poster({ media, onOpen }) {
  const title = displayTitle(media);
  return (
    <button
      className="pick-poster"
      onClick={(e) => onOpen(media, e.currentTarget.getBoundingClientRect())}
      aria-label={`Open details for ${title}`}
    >
      <img src={media.coverImage.large} alt="" loading="lazy" />
    </button>
  );
}

function SaveIcon({ media, saved, onSave }) {
  const title = displayTitle(media);
  return (
    <button
      className="icon-btn"
      onClick={() => onSave(media)}
      aria-pressed={saved}
      aria-label={`${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} want-to-watch`}
    >
      {saved ? <Check size={18} strokeWidth={3} /> : <Bookmark size={18} strokeWidth={2.5} />}
    </button>
  );
}

function Splash({ media, index, saved, onOpen, onSave }) {
  const title = displayTitle(media);
  return (
    <article className="pick pick-splash pop-in" style={{ '--i': index }}>
      <span className="pick-rank" aria-label={`Pick ${index + 1}`}>{rankLabel(index)}</span>
      <Poster media={media} onOpen={onOpen} />
      <div className="pick-body">
        <h4 className="pick-title">{title}</h4>
        {media.title.native && <div className="pick-native">{media.title.native}</div>}
        <PickMeta media={media} />
        {media._why && <p className="pick-why">{media._why}</p>}
        <div className="pick-actions">
          <button className="btn" onClick={() => onOpen(media)}><Play size={16} fill="currentColor" /> View details</button>
          <button className="btn secondary" onClick={() => onSave(media)}>
            {saved ? <><Check size={16} strokeWidth={3} /> Saved</> : <><Bookmark size={16} strokeWidth={2.5} /> Want to watch</>}
          </button>
        </div>
      </div>
    </article>
  );
}

function Rest({ media, index, variant, saved, onOpen, onSave }) {
  const title = displayTitle(media);
  return (
    <article className={`pick pick-${variant} pop-in`} style={{ '--i': index }}>
      <span className="pick-rank" aria-label={`Pick ${index + 1}`}>{rankLabel(index)}</span>
      <Poster media={media} onOpen={onOpen} />
      <div className="pick-body">
        <h4 className="pick-title">{title}</h4>
        {variant === 'medium' && <PickMeta media={media} />}
        {/* tabIndex so keyboard focus and a tap both reveal the full reasoning
            that the compact layout clamps. */}
        {media._why && <p className="pick-why" tabIndex={variant === 'compact' ? 0 : undefined}>{media._why}</p>}
        <div className="pick-actions">
          <SaveIcon media={media} saved={saved} onSave={onSave} />
        </div>
      </div>
    </article>
  );
}

/**
 * Ranked picks as a manga page: pick 01 as a splash panel, 02–03 as medium
 * panels, the rest as a compact row. Unranked results (the fallback when the
 * AI ranking is unavailable) have no reasons or ranks to lay out, so they use
 * the plain uniform grid instead.
 */
export default function PicksShowcase({ items, ranked, onOpen, onSave, isSaved }) {
  if (!ranked) return <Grid items={items} onOpen={onOpen} onSave={onSave} isSaved={isSaved} />;

  const [first, ...rest] = items;
  if (!first) return null;

  return (
    <div className="picks">
      <Splash media={first} index={0} saved={isSaved(first.id)} onOpen={onOpen} onSave={onSave} />
      {rest.length > 0 && (
        <div className="picks-rest">
          {rest.map((media, i) => (
            <Rest
              key={media.id}
              media={media}
              index={i + 1}
              variant={i < 2 ? 'medium' : 'compact'}
              saved={isSaved(media.id)}
              onOpen={onOpen}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
