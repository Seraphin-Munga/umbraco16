import type { ComponentProps } from 'react';
import { Select as ShadcnSelect } from '../shadcn-select';

// One generic <select> for every dropdown across the app (see
// LoanCalculator.tsx's term select) - callers pass their own className and
// <option> children rather than this component hardcoding a variant.
// Delegates entirely to the shadcn Select (shadcn-select.tsx) so every
// dropdown picks up the same token-based styling as Input/Button.
export type SelectProps = ComponentProps<typeof ShadcnSelect>;

export function Select(props: SelectProps) {
  return <ShadcnSelect {...props} />;
}
