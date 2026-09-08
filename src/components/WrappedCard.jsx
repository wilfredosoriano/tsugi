import { useEffect, useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { computeWrapped } from '../lib/wrapped.js';

const WIDTH = 1080;
const HEIGHT = 1920;

/** Shrinks a bold Inter string until it fits maxWidth, down to minSize. */
function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `900 ${size}px Inter, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function draw(ctx, { year, total, genres }) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#0a0a0f');
  bg.addColorStop(0.4, '#241c52');
  bg.addColorStop(0.75, '#4b3ad1');
  bg.addColorStop(1, '#8b7bff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
  glow(880, 260, 520, 'rgba(155,141,255,0.35)');
  glow(160, 1520, 460, 'rgba(124,108,255,0.28)');

  // logo
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px Inter, sans-serif';
  ctx.fillText('Tsugi', 80, 160);
  const logoWidth = ctx.measureText('Tsugi').width;
  ctx.fillStyle = '#c9beff';
  ctx.font = '700 64px "Noto Sans JP", sans-serif';
  ctx.fillText('次', 80 + logoWidth + 16, 160);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 30px Inter, sans-serif';
  ctx.fillText(`WRAPPED · ${year}`, 80, 210);

  // headline number
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 320px Inter, sans-serif';
  ctx.fillText(String(total), WIDTH / 2, 620);

  ctx.font = '700 44px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`anime completed in ${year}`, WIDTH / 2, 690);

  // top genre
  ctx.font = '700 34px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('YOUR TOP GENRE', WIDTH / 2, 860);

  const topGenre = genres[0]?.genre || '—';
  const size = fitFontSize(ctx, topGenre.toUpperCase(), WIDTH - 160, 140, 60);
  ctx.font = `900 ${size}px Inter, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(topGenre.toUpperCase(), WIDTH / 2, 970);

  // ranked genre list
  const list = genres.slice(0, 5);
  if (list.length) {
    const maxCount = list[0].count;
    const startY = 1120;
    const rowH = 110;
    const barMaxWidth = WIDTH - 300;
    list.forEach((g, i) => {
      const y = startY + i * rowH;

      ctx.textAlign = 'left';
      ctx.font = '900 40px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(String(i + 1), 80, y);

      ctx.font = '700 38px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(g.genre, 150, y);

      ctx.textAlign = 'right';
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(String(g.count), WIDTH - 80, y);

      const barWidth = Math.max(10, (g.count / maxCount) * barMaxWidth);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(150, y + 20, barMaxWidth, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(150, y + 20, barWidth, 10);
    });
  }

  ctx.textAlign = 'center';
  ctx.font = '600 30px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('tsugi — decide what to watch next', WIDTH / 2, HEIGHT - 70);
}

/**
 * Renders a shareable "year wrapped" recap card onto an offscreen canvas —
 * total completed + top genres for the given year — then exposes it as a
 * downloadable/shareable PNG. Genre counts come from the completions
 * snapshots taken at completion time (see useSaved.js), so it stays
 * accurate even if titles are later removed from the want-to-watch list.
 */
export default function WrappedCard({ year, items, onClose }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const stats = computeWrapped(items);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.ready;
      } catch {
        // font-loading API unavailable — draw with whatever's loaded
      }
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      draw(canvas.getContext('2d'), { year, total: stats.total, genres: stats.genres });
      canvas.toBlob((blob) => {
        if (!blob || cancelled) return;
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      }, 'image/png');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `tsugi-wrapped-${year}.png`;
    a.click();
  };

  const share = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `tsugi-wrapped-${year}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Tsugi Wrapped ${year}`,
            text: `My ${year} anime wrapped, made with Tsugi.`,
          });
        } catch {
          // user backed out of the native share sheet — no-op
        }
      } else {
        download();
      }
    }, 'image/png');
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet wrapped-sheet" role="dialog" aria-modal="true" aria-label={`Your ${year} anime wrapped`}>
        <div className="sheet-head">
          <h3 className="display">Your {year} wrapped</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="wrapped-body">
          <div className="wrapped-preview">
            {imageUrl
              ? <img src={imageUrl} alt={`Tsugi wrapped recap card for ${year}`} />
              : <div className="wrapped-loading">Building your card…</div>}
          </div>
          <canvas ref={canvasRef} hidden />
          <div className="transfer-actions">
            {canNativeShare && (
              <button className="btn" onClick={share} disabled={!imageUrl}>
                <Share2 size={15} /> Share
              </button>
            )}
            <button className="btn ghost" onClick={download} disabled={!imageUrl}>
              <Download size={15} /> Download image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
