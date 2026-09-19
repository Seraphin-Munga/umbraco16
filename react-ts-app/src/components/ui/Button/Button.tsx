import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

// Shared button so every "btn btn-brand-1 hover-up" / "btn-brand-link
// hover-up" / "btn btn-brand-secondary hover-up" anchor across the ported
// site (see HeroCarousel.tsx, MyWorldAccount.tsx, BankWithAudacity.tsx,
// Hero/HeroBanner.tsx, etc.) goes through one place. The classNames
// themselves come from the global vendor stylesheet
// (public/vendor/projectmagic.css) and Home.css, not from anything
// defined here - this component only picks which of those to apply.
// Renders an <a> when given an href, a <button> otherwise.
export type ButtonVariant = 'brand-1' | 'brand-link' | 'brand-secondary';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  'brand-1': 'btn btn-brand-1',
  'brand-link': 'btn-brand-link',
  'brand-secondary': 'btn btn-brand-secondary',
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
  const classes = [VARIANT_CLASS[variant], 'hover-up', className].filter(Boolean).join(' ');

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
