import { useEffect, useState } from 'react';

// Ported from "#creditBureauCheckModal" in Platform/Web/Views/newQQ.cshtml.
// The real page polled a credit-bureau-check API and updated
// #creditCheckStatus/#verificationText as results came back; there's no
// backend wired up here (UI-only per scope), so this simulates a short
// "Checking..." -> "Complete" sequence with a plain timeout and then calls
// onComplete. The caller (GetAQuote.tsx) remounts this component fresh via
// a changing `key` each time it opens, so the timers below only ever run
// once per open - no need to reset state on re-open here.
interface CreditBureauCheckModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CreditBureauCheckModal({
  open,
  onClose,
  onComplete,
}: CreditBureauCheckModalProps) {
  const [status, setStatus] = useState<'checking' | 'complete'>('checking');

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const completeTimer = setTimeout(() => setStatus('complete'), 1500);
    const advanceTimer = setTimeout(() => onComplete(), 2500);

    return () => {
      document.body.style.overflow = '';
      clearTimeout(completeTimer);
      clearTimeout(advanceTimer);
    };
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div
      className="model_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-bureau-modal-title"
    >
      <div className="creditBureau_modal_dialog">
        <div className="creditBureau_modal_header">
          <button
            type="button"
            className="get-a-quote-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="creditBureau_modal_body">
          <h2
            id="credit-bureau-modal-title"
            className="color-brand-1 mt-15 mb-20"
          >
            Quick Verifications
          </h2>

          {status === 'complete' && (
            <div id="creditCheckStatus" className="credit_check_status">
              <span>
                <strong>Credit Bureau Check</strong>
              </span>
              <span>Complete</span>
            </div>
          )}

          <p id="verificationText" className="font-md color-brand-1">
            {status === 'checking'
              ? 'Credit Bureau Check Checking . . .'
              : 'Verification complete.'}
          </p>

          {status === 'checking' && (
            <div className="creditBureau_loading">
              <p className="font-md color-brand-1">Loading</p>
              <span className="dots">. . . ..</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
