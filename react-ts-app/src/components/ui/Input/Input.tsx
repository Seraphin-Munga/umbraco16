import type { ComponentProps } from 'react';
import { Input as ShadcnInput } from '../shadcn-input';

// One generic <input> for every text/range/readonly field across the app
// (see LoanCalculator.tsx's amount field, its two range sliders, and its
// repayment output) - callers own their own className/type/wrapper markup.
// Delegates entirely to the shadcn Input (shadcn-input.tsx) so every field
// picks up the same token-based border/focus-ring/disabled styling; a
// caller's className still wins on any conflicting utility via tailwind-
// merge (see the `cn` package), same as before.
export type InputProps = ComponentProps<typeof ShadcnInput>;

export function Input(props: InputProps) {
  return <ShadcnInput {...props} />;
}
