import type { ComponentProps } from 'react';
import { Input as ShadcnInput } from '../shadcn-input';


export type InputProps = ComponentProps<typeof ShadcnInput>;

export function Input(props: InputProps) {
  return <ShadcnInput {...props} />;
}
