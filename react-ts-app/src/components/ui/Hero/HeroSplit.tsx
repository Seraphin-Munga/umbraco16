import { Button } from '../Button/Button';
import '../media-frame.css';
import './Hero.css';

export interface HeroCta {
  label: string;
  url: string;
}

export interface HeroSplitProps {
  heading: string;
  description?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  imageUrl?: string;
  imageAlt?: string;
}

// Two-column product hero (heroBannerBlock, CMS-driven - see
// cms/renderPageSection.tsx) - copy and CTA(s) on one side, a photo on the
// other, e.g. the Consolidation Loan "Combine up to 5 loans in 1" hero.
// Used on any page whose "sections" Block List includes a heroBannerBlock,
// not just Product Loan pages. Renders a single centered column, with no
// empty column reserved, when the editor hasn't attached a photo yet -
// image is optional on this block.
export function HeroSplit({
  heading,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = '',
}: HeroSplitProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <section className="hero-split mtb-120">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          <div className={hasImage ? 'col-xl-6 col-lg-6 col-md-6' : 'col-xl-12 col-lg-12 col-md-12'}>
            <h1 className="color-brand-1 major-title mb-20">{heading}</h1>
            {description && <p className="font-md color-brand-1">{description}</p>}
            {(primaryCta || secondaryCta) && (
              <div className="combo-btn mt-50 text-start column1">
                {primaryCta && (
                  <p className="combo-btn-text primary">
                    <Button href={primaryCta.url}>{primaryCta.label}</Button>
                  </p>
                )}
                {secondaryCta && (
                  <p className="combo-btn-text secondary">
                    <Button href={secondaryCta.url} variant="brand-link">
                      {secondaryCta.label}
                    </Button>
                  </p>
                )}
              </div>
            )}
          </div>

          {hasImage && (
            <div className="col-xl-6 col-lg-6 col-md-6">
              <div className="product-image-frame">
                <img src={imageUrl} alt={imageAlt} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
