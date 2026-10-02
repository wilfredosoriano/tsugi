import Plate from './Plate.jsx';
import Shelf from './Shelf.jsx';
import RevealHeading from './RevealHeading.jsx';

export function Grid({ items, onOpen, onSave, isSaved, horizontal = false, label = 'list' }) {
  const plates = items.map((media, i) => (
    <Plate
      key={media.id}
      media={media}
      index={i}
      saved={isSaved(media.id)}
      onOpen={onOpen}
      onSave={onSave}
    />
  ));
  return horizontal ? <Shelf label={label}>{plates}</Shelf> : <div className="grid">{plates}</div>;
}

export function Skeletons({ count = 12 }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="skel" key={i} style={{ '--i': i }} />
      ))}
    </div>
  );
}

export function Loading({ children }) {
  return (
    <div className="loading" role="status">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      {children || 'Searching the AniList catalog'}
    </div>
  );
}

/** Empty / error / info message. The big faint kanji is decoration only. */
export function Note({ children, error = false }) {
  return (
    <p className={`note${error ? ' err' : ''}`}>
      <span className="note-kanji" aria-hidden="true">{error ? '誤' : '空'}</span>
      {children}
    </p>
  );
}

export function SectionHead({ title, count, children }) {
  return (
    <div className="sec">
      <RevealHeading as="h3" key={title}>{title}</RevealHeading>
      {count && <span className="count">{count}</span>}
      {children && <div className="sec-actions">{children}</div>}
    </div>
  );
}
