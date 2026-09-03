import { useState } from 'react';
import { X, Copy, Check, Download, Upload } from 'lucide-react';

/**
 * Moves the want-to-watch list between devices without any account or
 * server — export copies/downloads the same JSON already sitting in
 * localStorage, import reads it back in and unions it into whatever's
 * already saved on this device.
 */
export default function ListTransfer({ saved, onImport, onClose }) {
  const [tab, setTab] = useState(saved.length > 0 ? 'export' : 'import');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null); // { added, skipped, invalid } | { error }
  const [copied, setCopied] = useState(false);

  const exportText = JSON.stringify(saved, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (permissions, older browser) — the
      // textarea below is still selectable and copyable by hand.
    }
  };

  const download = () => {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsugi-want-to-watch-${new Date().toISOString().slice(0, 10)}.json`;
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

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet transfer-sheet" role="dialog" aria-modal="true" aria-label="Move your want-to-watch list">
        <div className="sheet-head">
          <h3 className="display">Move your list</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="transfer-tabs">
          <button aria-pressed={tab === 'export'} onClick={() => setTab('export')}>Export</button>
          <button aria-pressed={tab === 'import'} onClick={() => setTab('import')}>Import</button>
        </div>

        {tab === 'export' ? (
          <div className="transfer-body">
            <p className="num">
              {saved.length > 0
                ? 'Copy this, or download it as a file — then paste or upload it on your other device.'
                : 'Nothing saved yet on this device.'}
            </p>
            <textarea readOnly value={exportText} onFocus={(e) => e.target.select()} />
            <div className="transfer-actions">
              <button className="btn" onClick={copy} disabled={saved.length === 0}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
              <button className="btn ghost" onClick={download} disabled={saved.length === 0}>
                <Download size={15} /> Download file
              </button>
            </div>
          </div>
        ) : (
          <div className="transfer-body">
            <p className="num">Paste what you copied on your other device, or upload the file.</p>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
              placeholder="Paste your exported list here…"
            />
            <div className="transfer-actions">
              <label className="btn ghost file-btn">
                <Upload size={15} /> Choose file
                <input type="file" accept="application/json" onChange={onFile} hidden />
              </label>
              <button className="btn" onClick={runImport} disabled={!importText.trim()}>
                Import
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
