import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
// different).
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

// The visible track color of both range sliders - a fixed green-to-navy
// gradient (not a value-tracking fill) matching the original's own static
// `background-image` on the slider, just expressed as a Tailwind gradient
// instead of a raw `-webkit-gradient(...)` string.
const RANGE_TRACK_CLASS =
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-brand-green to-brand-navy outline-none ' +
  '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[1px_2px_5px_rgba(0,0,0,0.2)] [&::-webkit-slider-thumb]:transition-all ' +
  '[&:hover::-webkit-slider-thumb]:h-6 [&:hover::-webkit-slider-thumb]:w-6 ' +
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[1px_2px_5px_rgba(0,0,0,0.2)]';

const PILL_INPUT_CLASS =
  'h-[50px] w-full rounded-full border-0 bg-white px-5 text-center text-xl font-bold text-black outline-none placeholder:text-base placeholder:font-medium placeholder:text-[#696969] focus:ring-2 focus:ring-[#259cd8]';

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
    <div>
      <h1 className="mb-5 text-3xl font-bold text-white md:text-4xl">Loan Calculator</h1>

      <div className="text-center" aria-describedby="loan-disclaimer">
        <p className="mb-6 text-left text-sm text-white">
          Please enter Loan amount between {formatRand(minAmount)} to {formatRand(maxAmount)}
        </p>

        <Input
          id="input-Amount1"
          className={PILL_INPUT_CLASS}
          type="text"
          value={formatRand(amount)}
          onChange={handleAmountChange}
          onKeyPress={allowDigitsOnly}
        />

        <div className="mt-4">
          <Input
            id="slide-range1"
            type="range"
            className={RANGE_TRACK_CLASS}
            min={minAmount}
            max={maxAmount}
            step={500}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </div>

        <div className="mb-6 flex justify-between text-sm text-white" aria-hidden="true">
          <span>{formatRand(minAmount)}</span>
          <span>{formatRand(maxAmount)}</span>
        </div>

        <label htmlFor="term1" className="mb-2 block text-left text-sm font-bold text-white">
          Repayment Term
        </label>
        <div className="relative">
          <Select
            className={`${PILL_INPUT_CLASS} appearance-none pr-12 text-left`}
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
          <ChevronDown className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-black" />
        </div>

        <div className="mt-4">
          <Input
            id="input-month1"
            type="range"
            className={RANGE_TRACK_CLASS}
            min={minTerm}
            max={maxTerm}
            value={term}
            onChange={(event) => setTerm(Number(event.target.value))}
          />
        </div>

        <div className="mb-6 flex justify-between text-sm text-white" aria-hidden="true">
          <span>{minTerm} Months</span>
          <span>{maxTerm} Months</span>
        </div>

        <label htmlFor="installment_calc1" className="mb-2 block text-left text-sm font-bold text-white">
          Monthly Repayment Will Be
        </label>
        <Input
          id="installment_calc1"
          className={`${PILL_INPUT_CLASS} mb-8`}
          type="text"
          value={monthlyRepayment}
          readOnly
          aria-label="Monthly installment amount"
        />

        <div className="text-left">
          <Button href={applyUrl} role="button" aria-label="apply for a loan button">
            Apply Now
          </Button>
        </div>
      </div>
    </div>
  );

  const image: ReactNode = (
    <div className="relative mx-auto flex max-w-sm items-center justify-center">
      <div className="absolute inset-0 rounded-[40%_60%_60%_40%/50%_60%_40%_50%] bg-white/25" />
      <img
        className="relative block max-h-[420px] w-auto"
        src={imageUrl}
        alt={imageAlt}
        role="img"
        aria-label={imageAlt}
        loading="lazy"
      />
    </div>
  );

  return (
    <section className="flex items-center py-10 md:py-20" aria-labelledby="loan-calculator">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[29px] bg-[#8095af] p-8 md:p-14">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
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
      </div>
    </section>
  );
}
