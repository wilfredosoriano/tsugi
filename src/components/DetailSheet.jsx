import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Play, Check, Plus, Search, ExternalLink } from 'lucide-react';
import { starParts, cleanText, legalLinks, searchLinks, displayTitle } from '../lib/format.js';
import { fetchRecommendations, fetchRelations } from '../lib/anilist.js';

const RELATION_ORDER = ['Prequel', 'Sequel', 'Parent story', 'Side story', 'Spin-off', 'Alternative', 'Full story', 'Summary', 'Compilation', 'Contains'];

export default function DetailSheet({ media, onClose, onOpenRelated, onSave, isSaved, sourceRect }) {
  const closeRef = useRef(null);
  const sheetRef = useRef(null);
  const [related, setRelated] = useState(null);
  const [seasons, setSeasons] = useState(null);

  // FLIP: the sheet mounts already in its natural final position, so we
  // measure that, then paint one frame with an inline transform mapping it
  // back onto the clicked card's rect (no transition), then release the
  // transform with a transition enabled — the browser animates the
  // correction, reading as the card growing into the modal rather than a
  // modal appearing from nowhere. Skipped entirely when there's no
  // sourceRect (hero/search/related/deep-link opens keep the plain pop-in).
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sourceRect || !sheet) return undefined;

    // getBoundingClientRect reports the POST-transform box, so any
    // transform left over from a previous run (StrictMode double-invokes
    // this in dev) would corrupt this measurement — reset first to
    // guarantee we're always measuring the untransformed natural rect.
    sheet.style.transition = 'none';
    sheet.style.transform = 'none';
    const final = sheet.getBoundingClientRect();

    const dx = (sourceRect.left + sourceRect.width / 2) - (final.left + final.width / 2);
    const dy = (sourceRect.top + sourceRect.height / 2) - (final.top + final.height / 2);
    const scaleX = sourceRect.width / final.width;
    const scaleY = sourceRect.height / final.height;

    sheet.style.opacity = '0.4';
    sheet.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

    sheet.getBoundingClientRect(); // force reflow so the transform above actually paints first

    const raf = requestAnimationFrame(() => {
      sheet.style.transition = 'transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 220ms ease';
      sheet.style.transform = 'none';
      sheet.style.opacity = '1';
    });

    return () => cancelAnimationFrame(raf);
  }, [sourceRect]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setRelated(null);
    fetchRecommendations(media.id)
      .then((list) => { if (live) setRelated(list.slice(0, 6)); })
      .catch(() => { if (live) setRelated([]); });
    return () => { live = false; };
  }, [media.id]);

  useEffect(() => {
    let live = true;
    setSeasons(null);
    fetchRelations(media.id)
      .then((list) => {
        if (!live) return;
        const sorted = [...list].sort(
          (a, b) => RELATION_ORDER.indexOf(a.label) - RELATION_ORDER.indexOf(b.label)
        );
        setSeasons(sorted);
      })
      .catch(() => { if (live) setSeasons([]); });
    return () => { live = false; };
  }, [media.id]);

  const title = displayTitle(media);
  const stars = starParts(media.averageScore);
  const studio = media.studios?.nodes?.[0]?.name;
  const links = legalLinks(media);
  const directSites = new Set(links.map((l) => l.site.toLowerCase()));
  const otherSearches = searchLinks(title).filter((s) => !directSites.has(s.site.toLowerCase()));
  const searches = otherSearches.filter((s) => s.licensed);
  const unlicensedSearches = otherSearches.filter((s) => !s.licensed);
  const synopsis = cleanText(media.description);
  const saved = isSaved?.(media.id);
  const trailerUrl =
    media.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${media.trailer.id}`
    : media.trailer?.site === 'dailymotion' ? `https://www.dailymotion.com/video/${media.trailer.id}`
    : null;

  const facts = [
    media.episodes && `${media.episodes} episodes`,
    (media.format || '').replace('_', ' ').toLowerCase(),
    media.seasonYear,
    studio,
    media.status && media.status.toLowerCase().replace('_', ' '),
  ].filter(Boolean);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={sheetRef}
        className={`sheet${sourceRect ? ' flip' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-head">
          <div>
            <h3 className="display">{title}</h3>
            {media.title.native && (
              <div className="native jp" style={{ marginTop: 5 }}>{media.title.native}</div>
            )}
          </div>
          <button className="x" onClick={onClose} ref={closeRef} aria-label="Close details">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="sheet-body">
          <div>
            <img className="cover" src={media.coverImage.large} alt={`Cover art for ${title}`} />
            {stars && (
              <div style={{ marginTop: 12 }}>
                <span className="stars">{stars.glyphs}</span>{' '}
                <span className="num">{stars.value} · {stars.raw}/100</span>
              </div>
            )}
            {onSave && (
              <button className={`btn ghost sheet-save${saved ? ' on' : ''}`} onClick={() => onSave(media)}>
                {saved ? <><Check size={15} /> Saved</> : <><Plus size={15} /> Want to watch</>}
              </button>
            )}
            {trailerUrl && (
              <a
                className="btn ghost sheet-save trailer-link"
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play size={14} fill="currentColor" /> Trailer
              </a>
            )}
          </div>

          <div>
            <div className="taglist">
              {(media.genres || []).map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>

            <p className="num">{facts.join(' · ')}</p>
            <p className="synopsis">{synopsis || 'No synopsis on record.'}</p>

            <div className="watch">
              <p className="mono" style={{ marginBottom: 10 }}>
                Watch it here
              </p>
              <div className="watch-links">
                {links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="watch-link official">
                    <Play size={12} fill="currentColor" />
                    {l.site}
                    <ExternalLink size={11} className="watch-link-ext" />
                  </a>
                ))}
                {searches.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="watch-link search">
                    <Search size={12} />
                    {l.site}
                    <ExternalLink size={11} className="watch-link-ext" />
                  </a>
                ))}
              </div>

              {unlicensedSearches.length > 0 && (
                <div className="watch-unlicensed">
                  <p className="mono watch-unlicensed-label">Unofficial</p>
                  <div className="watch-links">
                    {unlicensedSearches.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="watch-link unlicensed">
                        <Search size={12} />
                        {l.site}
                        <ExternalLink size={11} className="watch-link-ext" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {seasons !== null && seasons.length > 0 && (
          <div className="related">
            <p className="mono" style={{ padding: '0 20px' }}>Seasons &amp; related</p>
            <div className="related-row">
              {seasons.map(({ label, media: m }) => (
                <button
                  key={m.id}
                  className="related-item"
                  onClick={() => onOpenRelated ? onOpenRelated(m) : null}
                  aria-label={`Open details for ${displayTitle(m)} (${label})`}
                >
                  <span className="related-tag">{label}</span>
                  <img src={m.coverImage.large} alt="" loading="lazy" />
                  <span>{displayTitle(m)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {related !== null && related.length > 0 && (
          <div className="related">
            <p className="mono" style={{ padding: '0 20px' }}>More like this</p>
            <div className="related-row">
              {related.map((m) => (
                <button
                  key={m.id}
                  className="related-item"
                  onClick={() => onOpenRelated ? onOpenRelated(m) : null}
                  aria-label={`Open details for ${displayTitle(m)}`}
                >
                  <img src={m.coverImage.large} alt="" loading="lazy" />
                  <span>{displayTitle(m)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
