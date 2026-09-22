import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

// Shared button so every CTA across the ported site (HeroCarousel.tsx,
// MyWorldAccount.tsx, BankWithAudacity.tsx, Hero/HeroBanner.tsx, etc.) goes
// through one place. Tailwind classes here reproduce the exact values of
// projectmagic.css's .btn.btn-brand-1 / .btn.btn-brand-secondary and
// Home.css's .btn-brand-link, which this used to just reference by class
// name. `group` on every variant lets a child icon (e.g. Tap2GlassSection's
// arrow svg) react to hover via `group-hover:` instead of the old
// `.btn.btn-brand-1:hover .right-icon` sibling-selector rule.
// Renders an <a> when given an href, a <button> otherwise.
export type ButtonVariant = 'brand-1' | 'brand-link' | 'brand-secondary';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  'brand-1':
    'group inline-flex min-w-[220px] h-[50px] items-center justify-center rounded-full bg-brand-lime px-0 font-sans text-sm font-semibold uppercase text-white shadow-[2px_5px_10px_rgba(0,0,0,0.16)] transition-transform duration-500 ease-out',
  'brand-link': 'group inline-flex items-center font-sans text-sm font-semibold text-brand-lime transition-colors hover:underline',
  'brand-secondary':
    'group inline-flex min-w-[220px] h-[50px] items-center justify-center rounded-full border border-[#29418A] bg-white px-0 font-sans text-sm font-semibold uppercase text-brand-navy shadow-[2px_5px_10px_rgba(0,0,0,0.16)] transition-transform duration-500 ease-out',
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
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
