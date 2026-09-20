import { useEffect } from 'react';
import { Button } from '../../components/ui/Button/Button';

// Ported from "#cancelModal" in Platform/Web/Views/newQQ.cshtml.
interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelModal({ open, onClose, onConfirm }: CancelModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="model_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className="modal_dialog">
        <div className="modal_header">
          <button
            type="button"
            className="get-a-quote-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal_body">
          <h2 id="cancel-modal-title" className="color-brand-1 mt-15 mb-20">
            Confirmation
          </h2>
          <p className="font-md color-brand-1 mb-20">
            Are you sure you want to cancel?
          </p>
        </div>
        <div className="modal_footer">
          <Button onClick={onClose}>No, Continue</Button>
          <Button variant="brand-secondary" onClick={onConfirm}>
            Yes, Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
