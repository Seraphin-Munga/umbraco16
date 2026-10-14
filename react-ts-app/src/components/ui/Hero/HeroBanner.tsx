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
        className="relative mx-[10px] my-[10px] box-border flex h-[320px] overflow-hidden rounded-[16px] bg-black bg-cover bg-center sm:mx-[14px] sm:my-[14px] sm:h-[450px] sm:rounded-[24px]"
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      >
        {imageAlt && <span className="sr-only">{imageAlt}</span>}
        <div className="relative flex h-full w-full items-center bg-[image:var(--gradient-hero-overlay)]">
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
