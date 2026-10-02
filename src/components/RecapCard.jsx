import { useEffect, useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { computeRecap } from '../lib/recap.js';

const WIDTH = 1080;
const HEIGHT = 1920;

const SUMI = '#1a1626';
const PAPER = '#f5f5f8';
const SAKURA = '#ff4f8b';
const SAKURA_DEEP = '#d6266a';
const SIGNAL = '#ffd23f';
const DISPLAY = '"Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
const BODY = '"Zen Kaku Gothic New", system-ui, sans-serif';

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrinks a display string until it fits maxWidth, down to minSize. */
function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `400 ${size}px ${DISPLAY}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function halftone(ctx, cx, cy, radius) {
  ctx.fillStyle = SUMI;
  for (let y = cy - radius; y <= cy + radius; y += 28) {
    for (let x = cx - radius; x <= cx + radius; x += 28) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 1) continue;
      ctx.beginPath();
      ctx.arc(x, y, 7 * (1 - d), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function draw(ctx, { year, total, genres }) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  halftone(ctx, WIDTH - 40, 60, 360);
  halftone(ctx, 40, HEIGHT - 60, 320);

  // panel frame
  ctx.lineWidth = 12;
  ctx.strokeStyle = SUMI;
  roundedRect(ctx, 44, 44, WIDTH - 88, HEIGHT - 88, 56);
  ctx.stroke();

  // logo tile with a sakura offset shadow
  ctx.fillStyle = SAKURA;
  roundedRect(ctx, 106, 106, 120, 120, 28);
  ctx.fill();
  ctx.fillStyle = SUMI;
  roundedRect(ctx, 90, 90, 120, 120, 28);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  ctx.font = `400 72px ${DISPLAY}`;
  ctx.fillText('次', 150, 172);

  ctx.textAlign = 'left';
  ctx.fillStyle = SUMI;
  ctx.font = `400 84px ${DISPLAY}`;
  ctx.fillText('Tsugi', 250, 172);

  ctx.font = `900 42px ${BODY}`;
  ctx.fillStyle = '#5b5675';
  ctx.fillText(`Recap · ${year}`, 94, 300);

  // headline number
  ctx.textAlign = 'center';
  ctx.font = `400 400px ${DISPLAY}`;
  ctx.fillStyle = SAKURA;
  ctx.fillText(String(total), WIDTH / 2 + 16, 716);
  ctx.lineWidth = 10;
  ctx.strokeStyle = SUMI;
  ctx.strokeText(String(total), WIDTH / 2, 700);
  ctx.fillStyle = SIGNAL;
  ctx.fillText(String(total), WIDTH / 2, 700);

  ctx.font = `900 56px ${BODY}`;
  ctx.fillStyle = SUMI;
  ctx.fillText(`anime completed in ${year}`, WIDTH / 2, 810);

  // top genre
  ctx.font = `700 40px ${BODY}`;
  ctx.fillStyle = '#5b5675';
  ctx.fillText('Your top genre', WIDTH / 2, 940);

  const topGenre = genres[0]?.genre || '—';
  const size = fitFontSize(ctx, topGenre, WIDTH - 220, 130, 56);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = SAKURA_DEEP;
  ctx.fillText(topGenre, WIDTH / 2, 1070);

  // ranked genre list
  const list = genres.slice(0, 5);
  if (list.length) {
    const maxCount = list[0].count;
    const startY = 1220;
    const rowH = 118;
    const barX = 200;
    const barMaxWidth = WIDTH - 200 - 150;
    list.forEach((g, i) => {
      const y = startY + i * rowH;

      ctx.textAlign = 'left';
      ctx.font = `400 48px ${DISPLAY}`;
      ctx.fillStyle = SUMI;
      ctx.fillText(String(i + 1), 100, y);

      ctx.font = `900 44px ${BODY}`;
      ctx.fillText(g.genre, barX, y);

      ctx.textAlign = 'right';
      ctx.font = `400 40px ${DISPLAY}`;
      ctx.fillText(String(g.count), WIDTH - 100, y);

      const barWidth = Math.max(24, (g.count / maxCount) * barMaxWidth);
      ctx.fillStyle = '#ffffff';
      roundedRect(ctx, barX, y + 20, barMaxWidth, 26, 13);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = SAKURA_DEEP;
      roundedRect(ctx, barX, y + 20, barWidth, 26, 13);
      ctx.fill();
      ctx.stroke();
    });
  }

  ctx.textAlign = 'center';
  ctx.font = `700 34px ${BODY}`;
  ctx.fillStyle = '#5b5675';
  ctx.fillText('tsugi — decide what to watch next', WIDTH / 2, HEIGHT - 110);
}

/**
 * Renders a shareable "year recap" card onto an offscreen canvas — total
 * completed + top genres for the given year — then exposes it as a
 * downloadable/shareable PNG. Genre counts come from the completions
 * snapshots taken at completion time (see useSaved.js), so it stays
 * accurate even if titles are later removed from the want-to-watch list.
 */
export default function RecapCard({ year, items, onClose }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const stats = computeRecap(items);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Canvas text never triggers a font download by itself, so ask for
        // each face explicitly before drawing.
        await Promise.all([
          document.fonts.load('400 64px "Dela Gothic One"'),
          document.fonts.load('900 44px "Zen Kaku Gothic New"'),
          document.fonts.load('700 40px "Zen Kaku Gothic New"'),
          document.fonts.ready,
        ]);
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
    a.download = `tsugi-recap-${year}.png`;
    a.click();
  };

  const share = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `tsugi-recap-${year}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Tsugi Recap ${year}`,
            text: `My ${year} anime recap, made with Tsugi.`,
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
      <div className="sheet recap-sheet" role="dialog" aria-modal="true" aria-label={`Your ${year} anime recap`}>
        <div className="sheet-head">
          <h3 className="display">Your {year} recap</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="recap-body">
          <div className="recap-preview">
            {imageUrl
              ? <img src={imageUrl} alt={`Tsugi recap card for ${year}`} />
              : <div className="recap-loading">Building your card…</div>}
          </div>
          <canvas ref={canvasRef} hidden />
          <div className="transfer-actions">
            {canNativeShare && (
              <button className="btn" onClick={share} disabled={!imageUrl}>
                <Share2 size={15} /> Share
              </button>
            )}
            <button className="btn secondary" onClick={download} disabled={!imageUrl}>
              <Download size={15} /> Download image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
