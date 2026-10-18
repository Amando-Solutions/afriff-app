import { useEffect } from 'react';
import { X } from 'lucide-react';

// A panel that slides up from the bottom, with a rounded top and a close X.
export default function BottomSheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="bs-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bs-backdrop" onClick={onClose} />
      <div className="bs-panel">
        <div className="bs-handle" aria-hidden="true" />
        <div className="bs-head">
          <h2 className="bs-title">{title}</h2>
          <button type="button" className="bs-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="bs-body">{children}</div>
      </div>
    </div>
  );
}
