import { useEffect, useState } from 'react';
import { modalCloseButton, modalHeader, modalOverlay, modalTitle } from './styles';

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
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-bureau-modal-title"
    >
      <div className="w-[47%] max-sm:w-4/5 rounded-[32px] bg-[#fff] py-5 text-center shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
        <div className={`${modalHeader} mb-4 px-5`}>
          <button
            type="button"
            className={modalCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="relative text-sm">
          <h2 id="credit-bureau-modal-title" className={`${modalTitle} pr-1.5`}>
            Quick Verifications
          </h2>

          {status === 'complete' && (
            <div
              id="creditCheckStatus"
              className="mx-10 my-2.5 flex items-center justify-between text-base text-white"
            >
              <span>
                <strong>Credit Bureau Check</strong>
              </span>
              <span>Complete</span>
            </div>
          )}

          <p
            id="verificationText"
            className="text-base font-bold text-brand-navy"
          >
            {status === 'checking'
              ? 'Credit Bureau Check Checking . . .'
              : 'Verification complete.'}
          </p>

          {status === 'checking' && (
            <div className="mt-5 text-center">
              <p className="text-base text-brand-navy">Loading</p>
              <span>. . . ..</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
