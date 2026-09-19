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
// cms/renderPageSection.tsx) - e.g. the Personal Loan "We give credit /
// where progress is due" hero. Markup/classNames (section-banner/contact-
// banner/contact-overlay/contact-content) match the real production markup
// for this exact section verbatim - not invented names - so it renders
// correctly once that CSS (added to Hero.css) is loaded. headingLead is
// the thin line, headingHighlight the bold one underneath it - two plain
// CMS fields rather than one string an author would have to remember to
// format a certain way. Falls back to a plain black background (matches
// .contact-banner's own background-color) when no photo has been attached
// yet.
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
    <section className="section-banner">
      <div
        className="contact-banner"
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      >
        {imageAlt && <span className="visually-hidden">{imageAlt}</span>}
        <div className="contact-overlay">
          <div className="contact-content">
            {(headingLead || headingHighlight) && (
              <h1 className="text-white major-title mb-10">
                {headingLead}
                {headingLead && headingHighlight && <br />}
                <strong>
                  <span className="span-major-title">{headingHighlight}</span>
                </strong>
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
        </div>
      </div>
    </section>
  );
}
