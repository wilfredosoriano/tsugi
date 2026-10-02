const PETALS = [
  { x: '8%', s: 14, d: '11s', delay: '0s', drift: '60px' },
  { x: '22%', s: 10, d: '14s', delay: '3s', drift: '-40px' },
  { x: '38%', s: 16, d: '12s', delay: '6s', drift: '70px' },
  { x: '55%', s: 11, d: '15s', delay: '1.5s', drift: '-60px' },
  { x: '70%', s: 15, d: '13s', delay: '8s', drift: '50px' },
  { x: '84%', s: 12, d: '16s', delay: '4.5s', drift: '-50px' },
];

/** A few slow-falling sakura petals. Decorative; hidden under reduced motion. */
export default function Petals() {
  return (
    <div className="petals" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span key={i} className="petal" style={{ '--x': p.x, '--s': `${p.s}px`, '--d': p.d, '--delay': p.delay, '--drift': p.drift }} />
      ))}
    </div>
  );
}
