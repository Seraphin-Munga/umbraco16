import { Button } from '../Button/Button';
import type { HeroCta } from './HeroSplit';

export interface HeroBannerProps {
  headingLead?: string;
  headingHighlight?: string;
  description?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  imageUrl?: string;
  imageAlt?: string;
}

// Full-bleed background-photo hero (heroImageBannerBlock, CMS-driven - see
// cms/renderPageSection.tsx) - e.g. the Personal Loan "We give credit /
// where progress is due" hero. headingLead is the thin line,
// headingHighlight the bold one underneath it - two plain CMS fields
// rather than one string an author would have to remember to format a
// certain way. Falls back to a plain black background (matches the
// original .contact-banner's own background-color) when no photo has been
// attached yet.
//
// Was previously `.section-banner`/`.contact-banner`/`.contact-overlay`/
// `.contact-content` (own local Hero.css, ported verbatim from a live page
// - the Personal Loan hero) plus `.major-title`/`.span-major-title`/
// `.combo-btn`/etc from public/vendor/projectmagic.css, which isn't
// actually loaded anywhere (see PromoSplit.tsx's own comment on that same
// gap) - so those classNames rendered unstyled in production. Tailwind
// classes below reproduce Hero.css's confirmed values directly instead of
// a shared stylesheet - see LoanCalculator.tsx's own top comment for why
// the original's malformed background gradient (two `from()` stops, no
// `to()`) resolves to solid color, not a real gradient; this hero's own
// linear-gradient is well-formed, so it's reproduced as an actual gradient.
export function HeroBanner({
  headingLead,
  headingHighlight,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = '',
}: HeroBannerProps) {
  return (
    <section>
      <div
        className="relative mx-[10px] mb-[10px] box-border flex h-[320px] overflow-hidden rounded-[16px] bg-black bg-cover bg-center sm:mx-[14px] sm:mb-[14px] sm:h-[450px] sm:rounded-[24px]"
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      >
        {imageAlt && <span className="sr-only">{imageAlt}</span>}
        <div className="relative flex h-full w-full items-center bg-[linear-gradient(270deg,#002a602e_0%,#002a6085_38%,#002a60ba_100%)]">
          <div className="max-w-[700px] px-[25px] py-[20px] sm:px-[50px] sm:py-[40px]">
            {(headingLead || headingHighlight) && (
              <h1 className="mb-[10px] text-[20px] leading-none font-extralight text-white sm:text-[65px]">
                {headingLead}
                {headingLead && headingHighlight && <br />}
                <strong>
                  <span className="text-[20px] font-bold sm:text-[65px]">{headingHighlight}</span>
                </strong>
              </h1>
            )}
            {description && <p className="mb-[10px] text-base leading-[1.3] text-white">{description}</p>}
            {(primaryCta || secondaryCta) && (
              <div className="flex flex-wrap items-center gap-[30px]">
                {primaryCta && (
                  <Button href={primaryCta.url} variant="brand-secondary">
                    {primaryCta.label}
                  </Button>
                )}
                {secondaryCta && <Button href={secondaryCta.url}>{secondaryCta.label}</Button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
