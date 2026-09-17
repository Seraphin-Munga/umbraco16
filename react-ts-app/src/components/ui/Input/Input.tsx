import type { InputHTMLAttributes } from 'react';

// One generic <input> for every text/range/readonly field across the app
// (see LoanCalculator.tsx's amount field, its two range sliders, and its
// repayment output) - callers own their own className/type/wrapper markup
// rather than this component hardcoding a variant per field.
export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps) {
  return <input {...props} />;
}
