import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  btnPrimary,
  modalBody,
  modalCloseButton,
  modalDialog,
  modalFooter,
  modalHeader,
  modalOverlay,
} from './styles';

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
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
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
          <h2 id="otp-modal-title" className="mt-[15px] text-2xl font-bold text-brand-navy">
            Verify your information
          </h2>
          <p id="optNumberUser" className="mb-2.5 mt-5 text-sm">
            {phoneNumber
              ? `We've sent a one-time PIN to ${phoneNumber}.`
              : 'We’ve sent you a one-time PIN.'}
          </p>

          <div className="mb-[15px] flex flex-col items-center">
            <label
              htmlFor="otp-box-0"
              className="mb-[5px] mt-[15px] text-center text-sm font-bold text-brand-navy"
            >
              OTP Number:
            </label>
            <div id="otp-boxes" className="mt-2.5 flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-box-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  className="h-[50px] w-10 rounded border-none bg-[#F8F7F8] text-center text-sm font-bold text-[#3D565F] outline-none"
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

          <p className="text-brand-navy">
            Did not receive OTP?{' '}
            <a
              className="cursor-pointer text-[#007bff] underline"
              onClick={() => setSecondsLeft(COUNTDOWN_SECONDS)}
              role="button"
              tabIndex={0}
            >
              Resend
            </a>
          </p>

          <div className="mt-[30px] text-center font-bold text-brand-navy">
            {formatCountdown(secondsLeft)}
          </div>
        </div>
        <div className={modalFooter}>
          <button
            type="button"
            className={btnPrimary}
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
