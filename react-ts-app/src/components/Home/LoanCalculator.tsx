import type { KeyboardEvent } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "#loan-calculator" section of the current live home page
// markup. Static display only - the sliders/inputs are uncontrolled and show
// the source's own default values (amount 2 000, term 7 months, repayment
// 879.53); no interest-rate formula was provided so nothing recalculates on
// change. Two things from the source are intentionally dropped: a stray
// "optioncount += 1;" text node inside the <select> (leftover template
// output, not real content) and a mangled `<="" div="">` attribute on the
// <img> tag (a stray closing tag that got merged into it, not a real
// attribute).
function allowDigitsOnly(event: KeyboardEvent<HTMLInputElement>) {
  const charCode = event.charCode;
  const isAllowed = charCode === 8 || charCode === 0 || charCode === 13 || (charCode >= 48 && charCode <= 57);
  if (!isAllowed) event.preventDefault();
}

const TERM_OPTIONS = [7, 9, 12, 18, 24, 30, 36, 42, 48, 60, 72];

const RANGE_GRADIENT =
  '-webkit-gradient(linear, 0% 0%, 100% 0%, from(rgb(136, 188, 71)), from(rgb(0, 43, 96)))';

interface LoanCalculatorProps {
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number;
  termOptions?: number[];
  defaultTerm?: number;
  minTerm?: number;
  maxTerm?: number;
  monthlyRepayment?: string;
  applyUrl?: string;
  imageUrl?: string;
}

export function LoanCalculator({
  minAmount = 2000,
  maxAmount = 500000,
  defaultAmount = 2000,
  termOptions = TERM_OPTIONS,
  defaultTerm = 7,
  minTerm = 7,
  maxTerm = 72,
  monthlyRepayment = '879.53',
  applyUrl = '/en/home/get-a-quote/',
  imageUrl = 'https://www.africanbank.co.za/media/gxxokcop/loan-calc.png',
}: LoanCalculatorProps) {
  return (
    <section className="section-800 pt-50 pb-40 home-loan-calculator calculator-bg" aria-labelledby="loan-calculator">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          <div className="col-md-6">
            <h1 className="calculator-brand-1 mt-15 mb-20">Loan Calculator</h1>

            <div className="calculator-form" aria-describedby="loan-disclaimer">
              <p className="cal-loan-disclaimer" style={{ padding: '5px 0px' }}>
                Please enter Loan amount between R2 000 to R500 000
              </p>
              <label className="cal-amount" />

              <input
                id="input-Amount1"
                className="loan-inpt"
                type="text"
                defaultValue={defaultAmount}
                onKeyPress={allowDigitsOnly}
              />
              <div className="range-wrap">
                <div className="range-value" id="rangeV1" />
                <input
                  id="slide-range1"
                  type="range"
                  className="loan-range"
                  min={minAmount}
                  max={maxAmount}
                  step={500}
                  defaultValue={defaultAmount}
                  style={{ backgroundImage: RANGE_GRADIENT }}
                />
              </div>

              <div className="loans" aria-hidden="true" style={{ marginBottom: '-7px' }}>
                <div className="col-1" style={{ textAlign: 'left', fontSize: '14px' }}>
                  R2 000
                </div>
                <div />
                <div className="col-2" style={{ textAlign: 'right', fontSize: '14px' }}>
                  R500 000
                </div>
              </div>

              <label className="cal-amount">Repayment Term</label>
              <select className="loan-select-term" id="term1" defaultValue={defaultTerm}>
                {termOptions.map((months) => (
                  <option value={months} key={months}>
                    {months} Months
                  </option>
                ))}
              </select>

              <div className="range-wrap">
                <div className="range-value" id="rangeV2" />
                <input
                  id="input-month1"
                  type="range"
                  className="loan-range"
                  min={minTerm}
                  max={maxTerm}
                  defaultValue={defaultTerm}
                  style={{ backgroundImage: RANGE_GRADIENT }}
                />
              </div>

              <div className="Months" style={{ marginBottom: '-7px' }}>
                <div className="col-1" style={{ textAlign: 'left', fontSize: '14px' }}>
                  {minTerm} Months
                </div>
                <div />
                <div className="col-2" style={{ textAlign: 'right', fontSize: '14px' }}>
                  {' '}
                  {maxTerm} Months
                </div>
              </div>

              <label className="cal-amount">Monthly Repayment will be</label>
              <input
                id="installment_calc1"
                className="loan-inpt-return"
                type="text"
                value={monthlyRepayment}
                readOnly
                aria-label="Monthly installment amount"
              />

              <div className="combo-btn">
                <div className="mt-50 text-start column1">
                  <p className="combo-btn-text primary">
                    <Button href={applyUrl} role="button" aria-label="apply for a loan button">
                      Apply Now
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <img
              className="img-responsive d-block"
              src={imageUrl}
              alt="man aplying for a loan"
              role="img"
              aria-label="man aplying for a loan"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
