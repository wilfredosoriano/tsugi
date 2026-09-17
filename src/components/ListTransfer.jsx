import { useMemo, useState } from 'react';
import { X, Copy, Check, Download, Upload } from 'lucide-react';
import { isValidSavedItem } from '../hooks/useSaved.js';
import { displayTitle } from '../lib/format.js';

/** Non-interactive poster strip — just a visual preview, no open/save actions. */
function PreviewRow({ items }) {
  if (!items.length) return null;
  return (
    <div className="transfer-preview">
      {items.map((m) => (
        <div className="transfer-preview-item" key={m.id} title={displayTitle(m)}>
          <img src={m.coverImage.large} alt="" loading="lazy" />
        </div>
      ))}
    </div>
  );
}

/** Drops the personal watch-tracking fields — what's left is just "here's
    an anime", fit to hand to someone else rather than restore on a device
    you own. */
function stripStatus(items) {
  return items.map(({ watchStatus, progress, completedAt, ...rest }) => rest);
}

/**
 * Two different jobs share this one sheet: moving the want-to-watch list
 * between your own devices (full fidelity — status, progress, everything,
 * so it comes back looking exactly like it did) and sharing it with someone
 * else (just the titles — your watch status/progress isn't theirs to see,
 * and isn't useful to them anyway). Neither needs an account or a server:
 * both just copy/download the same kind of JSON already sitting in
 * localStorage, and import reads it back in and unions it into whatever's
 * already saved on this device — a shared list imports the same way a
 * moved one does, just landing with the default status instead of
 * whatever the sender had.
 */
export default function ListTransfer({ saved, onImport, onClose }) {
  const [tab, setTab] = useState(saved.length > 0 ? 'move' : 'import');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null); // { added, skipped, invalid } | { error }
  const [copied, setCopied] = useState(false);

  const moveText = JSON.stringify(saved, null, 2);
  const shareText = useMemo(() => JSON.stringify(stripStatus(saved), null, 2), [saved]);

  // Both sides already carry full media objects (cover art, title, etc.),
  // not just ids — an export from this app is self-contained — so the
  // preview is pure client-side rendering, no AniList fetch involved.
  const importPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(importText);
      return Array.isArray(parsed) ? parsed.filter(isValidSavedItem) : [];
    } catch {
      return [];
    }
  }, [importText]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (permissions, older browser) — the
      // textarea below is still selectable and copyable by hand.
    }
  };

  const download = (text, name) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setImportText).catch(() => {});
  };

  const runImport = () => {
    try {
      const parsed = JSON.parse(importText);
      setImportResult(onImport(parsed));
    } catch {
      setImportResult({ error: "That doesn't look like a valid exported list." });
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setCopied(false);
  };

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet transfer-sheet" role="dialog" aria-modal="true" aria-label="Move or share your want-to-watch list">
        <div className="sheet-head">
          <h3 className="display">Move or share your list</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="transfer-tabs">
          <button aria-pressed={tab === 'move'} onClick={() => switchTab('move')}>Move</button>
          <button aria-pressed={tab === 'share'} onClick={() => switchTab('share')}>Share</button>
          <button aria-pressed={tab === 'import'} onClick={() => switchTab('import')}>Import</button>
        </div>

        {tab === 'move' && (
          <div className="transfer-body">
            <p className="num">
              {saved.length > 0
                ? 'Copy this, or download it as a file — then paste or upload it on your other device. Keeps your watch status and progress.'
                : 'Nothing saved yet on this device.'}
            </p>
            <PreviewRow items={saved} />
            <textarea readOnly value={moveText} onFocus={(e) => e.target.select()} />
            <div className="transfer-actions">
              <button className="btn" onClick={() => copy(moveText)} disabled={saved.length === 0}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
              <button className="btn ghost" onClick={() => download(moveText, 'tsugi-want-to-watch')} disabled={saved.length === 0}>
                <Download size={15} /> Download file
              </button>
            </div>
          </div>
        )}

        {tab === 'share' && (
          <div className="transfer-body">
            <p className="num">
              {saved.length > 0
                ? "Just the titles, for sending to someone else — no watch status or progress, since that's yours, not theirs."
                : 'Nothing saved yet on this device.'}
            </p>
            <PreviewRow items={saved} />
            <textarea readOnly value={shareText} onFocus={(e) => e.target.select()} />
            <div className="transfer-actions">
              <button className="btn" onClick={() => copy(shareText)} disabled={saved.length === 0}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
              <button className="btn ghost" onClick={() => download(shareText, 'tsugi-shared-list')} disabled={saved.length === 0}>
                <Download size={15} /> Download file
              </button>
            </div>
          </div>
        )}

        {tab === 'import' && (
          <div className="transfer-body">
            <p className="num">Paste what you copied on your other device, or upload the file.</p>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
              placeholder="Paste your exported list here…"
            />
            {importText.trim() !== '' && (
              importPreview.length > 0
                ? <PreviewRow items={importPreview} />
                : <p className="num">No valid titles found in that text yet.</p>
            )}
            <div className="transfer-actions">
              <label className="btn ghost file-btn">
                <Upload size={15} /> Choose file
                <input type="file" accept="application/json" onChange={onFile} hidden />
              </label>
              <button className="btn" onClick={runImport} disabled={!importPreview.length}>
                {importPreview.length > 0 ? `Import ${importPreview.length} title${importPreview.length === 1 ? '' : 's'}` : 'Import'}
              </button>
            </div>
            {importResult?.error && <p className="note err">{importResult.error}</p>}
            {importResult && !importResult.error && (
              <p className="num">
                {importResult.added > 0
                  ? `Added ${importResult.added} new title${importResult.added === 1 ? '' : 's'}.`
                  : 'Nothing new — these were already in your list.'}
                {importResult.skipped > 0 && ` (${importResult.skipped} already saved.)`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
