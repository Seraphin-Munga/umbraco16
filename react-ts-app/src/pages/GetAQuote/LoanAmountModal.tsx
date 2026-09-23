import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Input/Select';
import {
  estimateMonthlyInstallment,
  formatRand,
} from '../../utils/loanCalculator';
import {
  btnPrimary,
  modalBody,
  modalCloseButton,
  modalDialog,
  modalFooter,
  modalHeader,
  modalOverlay,
  modalTitle,
} from './styles';

// Ported from the "#amountModal" overlay in Platform/Web/Views/newQQ.cshtml
// (lines 652-726) - the loan-amount step that "Personal Loan and Credit
// Card" opens from the get-a-quote product picker (openDialog('amountModal')
// in the source markup). Reuses the same estimateMonthlyInstallment/
// formatRand math as LoanCalculator.tsx rather than re-deriving it.
//
// The legacy modal's "Get Started" button (submitLoanAmount('amountModal'))
// fed into the rest of that 1500+ line multi-step quick-quote wizard
// (personal details, OTP, offers, etc.), which hasn't been built in this
// React app yet - only the amount/term step asked for here exists, so
// onGetStarted just receives the chosen amount/term for the caller to wire
// up once that flow exists.

function allowDigitsOnly(event: KeyboardEvent<HTMLInputElement>) {
  const charCode = event.charCode;
  const isAllowed =
    charCode === 8 ||
    charCode === 0 ||
    charCode === 13 ||
    (charCode >= 48 && charCode <= 57);
  if (!isAllowed) event.preventDefault();
}

const TERM_OPTIONS = [7, 9, 12, 18, 24, 30, 36, 42, 48, 60, 72];
const RANGE_GRADIENT =
  '-webkit-gradient(linear, 0% 0%, 100% 0%, from(rgb(136, 188, 71)), from(rgb(0, 43, 96)))';

const calcFieldBase =
  'mb-[23px] h-[50px] w-full rounded-[32px] border-none text-2xl text-[#112768] outline-none';

const amountInputClass = `${calcFieldBase} bg-[#E5EAEF] text-center font-bold`;

const outputInputClass = `${calcFieldBase} bg-transparent text-center text-[40px] appearance-none`;

const termSelectClass = `${calcFieldBase} mx-auto appearance-none cursor-pointer bg-[#E5EAEF] bg-[url('https://www.africanbank.co.za/media/1pzbuq4v/dropdown-select.svg')] bg-[right_7%_center] bg-no-repeat text-center transition-shadow duration-300 hover:shadow-[0px_5px_5px_#0000000a]`;

const rangeSliderClass =
  "my-[15px] w-full cursor-pointer appearance-none rounded-[5px] border-none py-[5px] outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fff] [&::-webkit-slider-thumb]:shadow-[1px_2px_5px_rgba(0,0,0,0.2)] [&::-webkit-slider-thumb]:transition-[width,height,box-shadow] [&::-webkit-slider-thumb]:duration-300 hover:[&::-webkit-slider-thumb]:h-[25px] hover:[&::-webkit-slider-thumb]:w-[25px] hover:[&::-webkit-slider-thumb]:shadow-[1px_2px_5px_rgba(0,0,0,0.5)]";

interface LoanAmountModalProps {
  open: boolean;
  onClose: () => void;
  onGetStarted: (amount: number, termMonths: number) => void;
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number;
  minTerm?: number;
  maxTerm?: number;
  defaultTerm?: number;
}

export function LoanAmountModal({
  open,
  onClose,
  onGetStarted,
  minAmount = 2000,
  maxAmount = 500000,
  defaultAmount = 2000,
  minTerm = 7,
  maxTerm = 72,
  defaultTerm = 7,
}: LoanAmountModalProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [term, setTerm] = useState(defaultTerm);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, '');
    if (digitsOnly === '') return;
    setAmount(Math.min(maxAmount, Math.max(minAmount, Number(digitsOnly))));
  }

  return (
    <div
      id="amountModal"
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="amount-modal-title"
    >
      <div className={`${modalDialog} text-center`}>
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
          <h2 id="amount-modal-title" className={modalTitle}>
            How much would you like to borrow for your Loan?
          </h2>

          <div className="text-left">
            <p className="py-[5px] text-sm text-brand-navy">
              Please enter Loan amount between{' '}
              <b className="text-brand-navy">{formatRand(minAmount)}</b> to{' '}
              <b className="text-brand-navy">{formatRand(maxAmount)}.</b>
            </p>
            <label className="mb-0 text-left text-sm font-bold text-brand-navy">
              Amount
            </label>
            <Input
              id="input-Amount1"
              className={amountInputClass}
              type="text"
              value={amount}
              onChange={handleAmountChange}
              onKeyPress={allowDigitsOnly}
            />

            <div className="relative">
              <div id="rangeV1" />
              <Input
                id="slide-range1"
                type="range"
                className={rangeSliderClass}
                min={minAmount}
                max={maxAmount}
                step={500}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                style={{ backgroundImage: RANGE_GRADIENT }}
              />
            </div>

            <div className="flex justify-between">
              <div>{formatRand(minAmount)}</div>
              <div>{formatRand(maxAmount)}</div>
            </div>

            <label className="mb-0 text-left text-sm font-bold text-brand-navy">
              Repayment Term
            </label>
            <Select
              className={termSelectClass}
              id="term1"
              value={term}
              onChange={(event) => setTerm(Number(event.target.value))}
            >
              {TERM_OPTIONS.map((months) => (
                <option value={months} key={months}>
                  {months} Months
                </option>
              ))}
            </Select>

            <div className="relative">
              <div id="rangeV2" />
              <Input
                id="input-month1"
                type="range"
                className={rangeSliderClass}
                min={minTerm}
                max={maxTerm}
                value={term}
                onChange={(event) => setTerm(Number(event.target.value))}
                style={{ backgroundImage: RANGE_GRADIENT }}
              />
            </div>

            <div className="flex justify-between">
              <div>{minTerm} Months</div>
              <div>{maxTerm} Months</div>
            </div>

            <label className="mb-0 text-left text-sm font-bold text-brand-navy">
              Your Monthly Repayment will be
            </label>
            <Input
              id="installment_calc1"
              className={outputInputClass}
              type="text"
              value={formatRand(estimateMonthlyInstallment(amount, term))}
              readOnly
              aria-label="Monthly installment amount"
            />
          </div>
        </div>
        <div className={modalFooter}>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => onGetStarted(amount, term)}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
