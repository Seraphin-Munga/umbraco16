import { Button } from '../Button/Button';
import '../media-frame.css';

export interface PromoSplitCta {
  label: string;
  url: string;
}

export interface PromoSplitProps {
  heading: string;
  description?: string;
  primaryCta?: PromoSplitCta | null;
  secondaryCta?: PromoSplitCta | null;
  imageUrl?: string;
  imageAlt?: string;
  imageOnRight?: boolean;
}

// Two-column promo with two pill CTAs (a filled primary + an outlined
// secondary), e.g. the MyWORLD "Bank Account" promo. Backed by
// promoSplitBlock (CMS-driven, any page - see cms/renderPageSection.tsx).
// Same layout family as Hero/HeroSplit.tsx, but the secondary CTA renders
// as its own pill (brand-secondary) instead of a text link, and the image
// side is CMS-toggleable rather than always on the right.
export function PromoSplit({
  heading,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = '',
  imageOnRight = true,
}: PromoSplitProps) {
  const hasImage = Boolean(imageUrl);

  const textColumn = (
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
              <Button href={secondaryCta.url} variant="brand-secondary">
                {secondaryCta.label}
              </Button>
            </p>
          )}
        </div>
      )}
    </div>
  );

  const imageColumn = hasImage && (
    <div className="col-xl-6 col-lg-6 col-md-6">
      <div className="product-image-frame">
        <img src={imageUrl} alt={imageAlt} />
      </div>
    </div>
  );

  return (
    <section className="promo-split mtb-120">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          {imageOnRight ? (
            <>
              {textColumn}
              {imageColumn}
            </>
          ) : (
            <>
              {imageColumn}
              {textColumn}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
