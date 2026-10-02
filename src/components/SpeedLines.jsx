const LINES = Array.from({ length: 44 }, (_, i) => {
  const angle = (i / 44) * Math.PI * 2;
  // Deterministic jitter so the burst looks hand-inked but never re-randomizes on render.
  const inner = 26 + ((i * 7) % 11);
  const width = 0.35 + ((i * 5) % 4) * 0.28;
  return {
    x1: 50 + Math.cos(angle) * inner, y1: 50 + Math.sin(angle) * inner,
    x2: 50 + Math.cos(angle) * 120, y2: 50 + Math.sin(angle) * 120,
    width,
  };
});

/** Decorative radial speed-line burst. Fills its (positioned) parent. */
export default function SpeedLines() {
  return (
    <svg className="speed-lines" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={l.width} />
      ))}
    </svg>
  );
}
