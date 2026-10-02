import { Fragment } from 'react';
import { useInView } from '../hooks/useInView.js';

/**
 * Heading whose words rise one by one out of a mask the first time it
 * scrolls into view. Plain text stays in the DOM (words are separated by
 * real spaces), so screen readers read it normally; the animation itself is
 * CSS and switches off under prefers-reduced-motion.
 */
export default function RevealHeading({ as: Tag = 'h3', children, className = '' }) {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -10% 0px' });
  const words = String(children).split(/\s+/).filter(Boolean);

  return (
    <Tag ref={ref} className={`reveal${inView ? ' in' : ''} ${className}`.trim()}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="rv-word"><span className="rv-inner" style={{ '--w': i }}>{word}</span></span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
