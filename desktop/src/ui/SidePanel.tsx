import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './side-panel.css';

/** Debe coincidir con --dur-panel-out (150 ms): el panel sigue montado mientras sale. */
const EXIT_MS = 150;
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

interface SidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Mientras es true hay un guardado en curso: Esc y el clic en el fondo no cierran. */
  busy?: boolean;
  children: ReactNode;
}

/** Panel lateral reutilizable: fondo atenuado, Esc/fondo cierran, Tab queda dentro y el foco vuelve a quien lo abrió. */
export function SidePanel({ open, title, onClose, busy = false, children }: SidePanelProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const titleId = useId();

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      // Un frame después de montar, para que la entrada se anime desde el estado oculto.
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => {
      setMounted(false);
      opener.current?.focus();
      opener.current = null;
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className={`side-panel-root${shown && open ? ' side-panel-shown' : ''}`}>
      <div className="side-panel-backdrop" onClick={busy ? undefined : onClose} />
      <div ref={panelRef} className="side-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="side-panel-title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
