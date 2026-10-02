import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

/** The Ask screen's message box: grows with the text, Enter sends, Shift+Enter adds a line. */
export default function ChatComposer({ onSend, busy }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden';
  }, [text]);

  // Focus on desktop only — on a phone it would throw the keyboard up unasked.
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) ref.current?.focus();
  }, []);

  const submit = () => {
    if (busy || !text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about anime, or say what you're in the mood for…"
        aria-label="Message the Tsugi companion"
        maxLength={600}
      />
      <button className="btn composer-send" type="submit" disabled={busy || !text.trim()} aria-label="Send">
        <SendHorizontal size={20} strokeWidth={2.5} />
      </button>
    </form>
  );
}
