import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Input/Select';
import { estimateMonthlyInstallment, formatRand } from '../../utils/loanCalculator';

// Ported from the "#amountModal" overlay in Platform/Web/Views/newQQ.cshtml
// (lines 652-726) - the loan-amount step that "Personal Loan and Credit
// Card" opens from the get-a-quote product picker (openDialog('amountModal')
// in the source markup). Reuses the same estimateMonthlyInstallment/
// formatRand math as LoanCalculator.tsx rather than re-deriving it, and the
// same .calculator-form/.loan-range styling from Home.css.
//
// The legacy modal's "Get Started" button (submitLoanAmount('amountModal'))
// fed into the rest of that 1500+ line multi-step quick-quote wizard
// (personal details, OTP, offers, etc.), which hasn't been built in this
// React app yet - only the amount/term step asked for here exists, so
// onGetStarted just receives the chosen amount/term for the caller to wire
// up once that flow exists.

function allowDigitsOnly(event: KeyboardEvent<HTMLInputElement>) {
  const charCode = event.charCode;
  const isAllowed = charCode === 8 || charCode === 0 || charCode === 13 || (charCode >= 48 && charCode <= 57);
  if (!isAllowed) event.preventDefault();
}

const TERM_OPTIONS = [7, 9, 12, 18, 24, 30, 36, 42, 48, 60, 72];
const RANGE_GRADIENT =
  '-webkit-gradient(linear, 0% 0%, 100% 0%, from(rgb(136, 188, 71)), from(rgb(0, 43, 96)))';

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
    <div className="model_overlay" role="dialog" aria-modal="true" aria-labelledby="amount-modal-title">
      <div className="modal_dialog">
        <div className="modal_content">
          <div className="modal_header">
            <i className="material-icons close-icon" onClick={onClose} role="button" aria-label="Close">
              close
            </i>
          </div>
          <div className="modal_body">
            <h2 id="amount-modal-title" className="color-brand-1 mt-15 mb-20">
              How much would you like to borrow for your Loan?
            </h2>

            <div className="calculator-form">
              <p className="cal-loan-disclaimer" style={{ padding: '5px 0px' }}>
                Please enter Loan amount between <b>{formatRand(minAmount)}</b> to <b>{formatRand(maxAmount)}.</b>
              </p>
              <label className="cal-amount">Amount</label>
              <Input
                id="input-Amount1"
                className="loan-inpt"
                type="text"
                value={amount}
                onChange={handleAmountChange}
                onKeyPress={allowDigitsOnly}
              />

              <div className="range-wrap">
                <div className="range-value" id="rangeV1" />
                <Input
                  id="slide-range1"
                  type="range"
                  className="loan-range"
                  min={minAmount}
                  max={maxAmount}
                  step={500}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  style={{ backgroundImage: RANGE_GRADIENT }}
                />
              </div>

              <div className="loans">
                <div className="col-1" style={{ textAlign: 'left', fontSize: '14px', color: '#335580' }}>
                  {formatRand(minAmount)}
                </div>
                <div className="col-2" style={{ textAlign: 'right', fontSize: '14px', color: '#335580' }}>
                  {formatRand(maxAmount)}
                </div>
              </div>

              <label className="cal-amount">Repayment Term</label>
              <Select
                className="loan-select-term"
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

              <div className="range-wrap">
                <div className="range-value" id="rangeV2" />
                <Input
                  id="input-month1"
                  type="range"
                  className="loan-range"
                  min={minTerm}
                  max={maxTerm}
                  value={term}
                  onChange={(event) => setTerm(Number(event.target.value))}
                  style={{ backgroundImage: RANGE_GRADIENT }}
                />
              </div>

              <div className="Months">
                <div className="col-1" style={{ textAlign: 'left', fontSize: '14px', color: '#335580' }}>
                  {minTerm} Months
                </div>
                <div className="col-2" style={{ textAlign: 'right', fontSize: '14px', color: '#335580' }}>
                  {maxTerm} Months
                </div>
              </div>

              <label className="cal-amount">Your Monthly Repayment will be</label>
              <Input
                id="installment_calc1"
                className="loan-inpt-return"
                type="text"
                value={formatRand(estimateMonthlyInstallment(amount, term))}
                readOnly
                aria-label="Monthly installment amount"
              />
            </div>
          </div>
          <div className="modal_footer">
            <button className="btn btn-primary" onClick={() => onGetStarted(amount, term)}>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
