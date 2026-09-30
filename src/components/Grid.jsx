import Plate from './Plate.jsx';

export function Grid({ items, ranked = false, onOpen, onSave, isSaved, horizontal = false }) {
  return (
    <div className={horizontal ? 'grid-rail' : 'grid'}>
      {items.map((media, i) => (
        <Plate
          key={media.id}
          media={media}
          rank={ranked ? i : null}
          index={i}
          caption={ranked ? media._why : undefined}
          saved={isSaved(media.id)}
          onOpen={onOpen}
          onSave={onSave}
        />
      ))}
    </div>
  );
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
      {children}
    </div>
  );
}

export function Note({ children, error = false }) {
  return <p className={`note${error ? ' err' : ''}`}>{children}</p>;
}

export function SectionHead({ title, count, children }) {
  return (
    <div className="sec">
      <h3>{title}</h3>
      {count && <span className="count">{count}</span>}
      {children && <div className="sec-actions">{children}</div>}
    </div>
  );
}
