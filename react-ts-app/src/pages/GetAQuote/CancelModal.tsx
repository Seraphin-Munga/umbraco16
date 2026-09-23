import { useEffect } from 'react';
import {
  modalBody,
  modalCloseButton,
  modalDialog,
  modalFooter,
  modalHeader,
  modalOverlay,
  modalTitle,
  btnPrimary,
  btnTertiary,
} from './styles';

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
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className={modalDialog}>
        <div className={modalHeader}>
          <button
            type="button"
            className={modalCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={modalBody}>
          <h2 id="cancel-modal-title" className={modalTitle}>
            Confirmation
          </h2>
          <p className="mb-5 text-base text-brand-navy">
            Are you sure you want to cancel?
          </p>
        </div>
        <div className={modalFooter}>
          <button type="button" className={btnPrimary} onClick={onClose}>
            No, Continue
          </button>
          <button type="button" className={btnTertiary} onClick={onConfirm}>
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
