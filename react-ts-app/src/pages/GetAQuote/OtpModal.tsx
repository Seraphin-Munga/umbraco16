import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

// Ported from "#otpModal" in Platform/Web/Views/newQQ.cshtml - six single-
// digit boxes (handleBoxInput) feeding a hidden combined OTP value, a 60
// second countdown, and a Resend link. No backend is wired up (UI-only per
// scope): "Continue" just calls onVerified once all six digits are entered,
// and Resend just restarts the countdown.
const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 60;

interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  phoneNumber?: string;
}

function formatCountdown(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function OtpModal({
  open,
  onClose,
  onVerified,
  phoneNumber,
}: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const timer = setInterval(
      () => setSecondsLeft((current) => current - 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [open, secondsLeft]);

  if (!open) return null;

  const isComplete = digits.every((digit) => digit !== '');

  function handleBoxInput(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div
      className="model_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
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
          <h2 id="otp-modal-title" className="color-brand-1 mt-15">
            Verify your information
          </h2>
          <p id="optNumberUser">
            {phoneNumber
              ? `We've sent a one-time PIN to ${phoneNumber}.`
              : 'We’ve sent you a one-time PIN.'}
          </p>

          <div className="input_container">
            <label htmlFor="otp-box-0">OTP Number:</label>
            <div id="otp-boxes">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-box-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleBoxInput(index, event)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                />
              ))}
            </div>
          </div>

          <p className="color-brand-1">
            Did not receive OTP?{' '}
            <a
              className="resend-otp"
              onClick={() => setSecondsLeft(COUNTDOWN_SECONDS)}
              role="button"
              tabIndex={0}
            >
              Resend
            </a>
          </p>

          <div
            style={{
              textAlign: 'center',
              marginTop: '30px',
              color: '#002b60',
              fontWeight: 700,
            }}
          >
            {formatCountdown(secondsLeft)}
          </div>
        </div>
        <div className="modal_footer">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isComplete}
            onClick={onVerified}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
