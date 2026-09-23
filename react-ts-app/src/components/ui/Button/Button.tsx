import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from 'cn';
import { buttonVariants } from '../shadcn-button';

// Shared button so every CTA across the ported site (HeroCarousel.tsx,
// MyWorldAccount.tsx, BankWithAudacity.tsx, Hero/HeroBanner.tsx, etc.) goes
// through one place. Built on top of the shadcn buttonVariants (shadcn-
// button.tsx) rather than its own class map, so every color here (brand
// pill fill, brand-navy border/text, shadow) is a theme token from
// index.css instead of an inline hex value. Renders an <a> when given an
// href, a <button> otherwise - the shadcn Button itself doesn't model that
// dual-render, so this wrapper keeps owning it.
export type ButtonVariant = 'brand-1' | 'brand-link' | 'brand-secondary';

const VARIANT_TO_BUTTON_VARIANTS: Record<ButtonVariant, { variant: ButtonVariant; size: 'pill' | 'link' }> = {
  'brand-1': { variant: 'brand-1', size: 'pill' },
  'brand-secondary': { variant: 'brand-secondary', size: 'pill' },
  'brand-link': { variant: 'brand-link', size: 'link' },
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

type ButtonAsLink = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & { href: string };

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button(props: ButtonProps) {
  const { variant = 'brand-1', className, children, ...rest } = props;
  const classes = cn(buttonVariants(VARIANT_TO_BUTTON_VARIANTS[variant]), className);

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <a data-slot="button" data-variant={variant} href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button data-slot="button" data-variant={variant} type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
