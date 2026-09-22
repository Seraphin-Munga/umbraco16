import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "MyWORLD bank account" promo section of the current live
// home page markup. Content comes from the CMS-managed homePage node (see
// contentApi.ts's fetchHomePageSections) - no hardcoded fallback content,
// so the CTA button only renders when the editor has set both a label and
// a URL for it.
interface MyWorldAccountProps {
  features: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  heading?: ReactNode;
  subheading?: ReactNode;
}

export function MyWorldAccount({ features, ctaLabel, ctaUrl, heading, subheading }: MyWorldAccountProps) {
  return (
    <section className="my-10 md:my-[120px]">
      <div className="mx-auto max-w-7xl px-4 text-center max-[768px]:text-left sm:px-6 md:grid md:grid-cols-12 md:items-end md:gap-8 lg:px-8">
        <div className="md:col-span-7">
          <h1 className="text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
          {ctaLabel && ctaUrl && (
            <div className="mt-8 text-left">
              <Button href={ctaUrl}>{ctaLabel}</Button>
            </div>
          )}
        </div>

        <div className="mt-10 md:col-span-5 md:mt-0">
          <h4 className="mb-5 font-semibold text-brand-ink">{subheading}</h4>
          <ul className="flex flex-wrap">
            {features.map((feature) => (
              <li key={feature} className="mb-3 flex w-1/2 items-start gap-2 pr-2 text-left text-sm text-brand-ink">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  className="mt-0.5 shrink-0"
                  style={{ color: '#5dc300' }}
                >
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
