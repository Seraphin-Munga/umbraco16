import type { SelectHTMLAttributes } from 'react';

// One generic <select> for every dropdown across the app (see
// LoanCalculator.tsx's term select) - callers pass their own className and
// <option> children rather than this component hardcoding a variant.
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select(props: SelectProps) {
  return <select {...props} />;
}
