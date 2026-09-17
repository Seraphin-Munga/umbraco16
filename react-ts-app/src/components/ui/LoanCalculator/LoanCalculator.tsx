import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Select } from '../Input/Select';
import { estimateMonthlyInstallment, formatRand } from '../../../utils/loanCalculator';

// Ported from the "#loan-calculator" section of the current live home page
// markup (originally src/components/Home/LoanCalculator.tsx, moved here so
// it can be reused outside Home - see Home.tsx's own usage, and
// PersonalLoanPage.tsx's own calculator section, which reuses the
// estimateMonthlyInstallment formula but not this component, since that
// page's surrounding layout - disclaimer text instead of an image - is
// different). Its styling still lives in src/components/Home/Home.css
// (.home-loan-calculator, .calculator-form, .loan-range, etc.) rather than
// a CSS file of its own - that's fine at runtime since Vite bundles every
// imported stylesheet into one global CSS file regardless of which route
// renders it, but it does mean Home.css can't be deleted while this
// component is still in use elsewhere.
//
// The repayment formula (estimateMonthlyInstallment) was found in
// personalLoanCampaign.cshtml's `installmentEstimator` JS function - this
// component now recalculates on every amount/term change instead of only
// ever showing the source's static default (879.53 for 2 000 over 7
// months). Two things from the source are intentionally dropped: a stray
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

export interface LoanCalculatorProps {
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number;
  termOptions?: number[];
  defaultTerm?: number;
  minTerm?: number;
  maxTerm?: number;
  applyUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  // Which side the image renders on, alongside the calculator form.
  imagePosition?: 'left' | 'right';
}

export function LoanCalculator({
  minAmount = 2000,
  maxAmount = 500000,
  defaultAmount = 2000,
  termOptions = TERM_OPTIONS,
  defaultTerm = 7,
  minTerm = 7,
  maxTerm = 72,
  applyUrl = '/en/home/get-a-quote/',
  imageUrl = 'https://www.africanbank.co.za/media/gxxokcop/loan-calc.png',
  imageAlt = 'man aplying for a loan',
  imagePosition = 'right',
}: LoanCalculatorProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [term, setTerm] = useState(defaultTerm);

  const monthlyRepayment = useMemo(() => formatRand(estimateMonthlyInstallment(amount, term)), [amount, term]);

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, '');
    if (digitsOnly === '') return;
    setAmount(Math.min(maxAmount, Math.max(minAmount, Number(digitsOnly))));
  }

  const form: ReactNode = (
    <div className="col-md-6">
      <h1 className="calculator-brand-1 mt-15 mb-20">Loan Calculator</h1>

      <div className="calculator-form" aria-describedby="loan-disclaimer">
        <p className="cal-loan-disclaimer" style={{ padding: '5px 0px' }}>
          Please enter Loan amount between {formatRand(minAmount)} to {formatRand(maxAmount)}
        </p>
        <label className="cal-amount" />

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

        <div className="loans" aria-hidden="true" style={{ marginBottom: '-7px' }}>
          <div className="col-1" style={{ textAlign: 'left', fontSize: '14px' }}>
            {formatRand(minAmount)}
          </div>
          <div />
          <div className="col-2" style={{ textAlign: 'right', fontSize: '14px' }}>
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
          {termOptions.map((months) => (
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
        <Input
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
  );

  const image: ReactNode = (
    <div className="col-md-6">
      <img
        className="img-responsive d-block"
        src={imageUrl}
        alt={imageAlt}
        role="img"
        aria-label={imageAlt}
        loading="lazy"
      />
    </div>
  );

  return (
    <section className="section-800 pt-50 pb-40 home-loan-calculator calculator-bg" aria-labelledby="loan-calculator">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          {imagePosition === 'left' ? (
            <>
              {image}
              {form}
            </>
          ) : (
            <>
              {form}
              {image}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
