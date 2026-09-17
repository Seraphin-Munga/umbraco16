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
    <section className="section-title mtb-120">
      <div className="container">
        <div className="row align-items-end md-text-center">
          <div className="col-md-7">
            <h1 className="color-brand-1 major-title">{heading}</h1>
            {ctaLabel && ctaUrl && (
              <div className="mt-50 text-start">
                <div className="mb-50">
                  <div className="combo-btn mt-50 text-start column1">
                    <p className="combo-btn-text primary">
                      <Button href={ctaUrl}>{ctaLabel}</Button>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-md-5">
            <h4 className="color-brand-1 mb-20">{subheading}</h4>
            <div className="mt-30 mb-30 inline-checklist">
              <ul className="list-ticks list-ticks-2">
                {features.map((feature) => (
                  <li key={feature}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-check-lg"
                      viewBox="0 0 16 16"
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
        </div>
      </div>
    </section>
  );
}
