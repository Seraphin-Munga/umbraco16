import type { ComponentProps } from 'react';
import { Select as ShadcnSelect } from '../shadcn-select';


export type SelectProps = ComponentProps<typeof ShadcnSelect>;

export function Select(props: SelectProps) {
  return <ShadcnSelect {...props} />;
}
