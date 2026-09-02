import Plate from './Plate.jsx';
import { SORTS } from '../lib/anilist.js';

export function Grid({ items, ranked = false, onOpen, onSave, isSaved, horizontal = false }) {
  return (
    <div className={horizontal ? 'grid-rail' : 'grid'}>
      {items.map((media, i) => (
        <Plate
          key={media.id}
          media={media}
          rank={ranked ? i : null}
          index={i}
          caption={media._why}
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
      {count && <span className="count mono">{count}</span>}
      {children}
    </div>
  );
}

export function SortControl({ value, onChange }) {
  return (
    <label className="sortctl mono">
      Sort
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sort browse results">
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}
