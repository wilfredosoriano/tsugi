import { useState } from 'react';
import AiringRail from './AiringRail.jsx';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Mon-Sun tab picker over `days` (7 popularity-sorted buckets from
 * fetchWeeklyAiring) — a discovery surface for the whole week's schedule,
 * distinct from the personal-list-scoped "Airing soon" rail/bell. Reuses
 * AiringRail for the actual cards rather than inventing a second card
 * style just to cram seven columns side by side.
 */
export default function AiringCalendar({ days, onOpen, vertical = false }) {
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const [active, setActive] = useState(todayIndex);
  const items = days[active] || [];

  return (
    <div className="calendar">
      <div className="calendar-tabs">
        {DAY_LABELS.map((label, i) => (
          <button
            key={label}
            className={`calendar-tab${i === active ? ' active' : ''}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            {label}
            {i === todayIndex && <span className="calendar-tab-today" aria-hidden="true" />}
            <span className="calendar-tab-count">{days[i]?.length || 0}</span>
          </button>
        ))}
      </div>
      {items.length > 0 ? (
        <AiringRail items={items} onOpen={onOpen} vertical={vertical} />
      ) : (
        <p className="num calendar-empty">Nothing scheduled for this day yet.</p>
      )}
    </div>
  );
}
