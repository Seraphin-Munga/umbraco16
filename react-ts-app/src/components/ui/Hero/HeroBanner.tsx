import { Button } from '../Button/Button';
import type { HeroCta } from './HeroSplit';
import './Hero.css';

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
// cms/renderPageSection.tsx) - a dark overlay across a CMS-picked photo,
// e.g. the Personal Loan "We give credit / where progress is due" hero.
// Used on any page whose "sections" Block List includes a
// heroImageBannerBlock, not just Home. headingLead is the thin line,
// headingHighlight the bold one underneath it - two plain CMS fields
// rather than one string an author would have to remember to format a
// certain way. Falls back to a plain brand-navy gradient when no photo has
// been attached yet.
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
    <section
      className="hero-banner"
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
    >
      {imageAlt && <span className="visually-hidden">{imageAlt}</span>}
      <div className="hero-banner__overlay" aria-hidden="true" />
      <div className="container hero-banner__content">
        {(headingLead || headingHighlight) && (
          <h1 className="text-white major-title mb-10">
            {headingLead}
            {headingLead && headingHighlight && <br />}
            <span className="span-major-title">{headingHighlight}</span>
          </h1>
        )}
        {description && <p className="text-white font-md mb-10">{description}</p>}
        {(primaryCta || secondaryCta) && (
          <div className="combo-btn">
            {primaryCta && (
              <div className="text-start column1">
                <p className="combo-btn-text primary">
                  <Button href={primaryCta.url} variant="brand-secondary">
                    {primaryCta.label}
                  </Button>
                </p>
              </div>
            )}
            {secondaryCta && (
              <div className="text-start column2">
                <p className="combo-btn-text secondary">
                  <Button href={secondaryCta.url}>{secondaryCta.label}</Button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
