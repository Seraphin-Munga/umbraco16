import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';
import { LazyImage } from '../Image/LazyImage';
import { Card } from '../card';

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
  background?: string;
  imagePlain?: boolean;
}

// Two-column promo with two pill CTAs (a filled primary + an outlined
// secondary), e.g. the MyWORLD "Bank Account" promo. Backed by
// promoSplitBlock (CMS-driven, any page - see cms/renderPageSection.tsx).
// Same layout family as Hero/HeroSplit.tsx, but the secondary CTA renders
// as its own pill (brand-secondary) instead of a text link, and the image
// side is CMS-toggleable rather than always on the right.
//
// Was previously `.promo-split`/`.container`/`.row`/`.col-xl-6`/`.major-
// title`/`.combo-btn`/etc, styled entirely by public/vendor/projectmagic.css
// - a stylesheet that isn't actually loaded anywhere (only style.css,
// media-query.css, main.min.css, custom_main.min.css and loan-calculator.css
// are, per index.css), so this component has been rendering unstyled in
// production. Tailwind classes below reproduce projectmagic.css's real
// values (.major-title's font-weight:200/65px, .combo-btn's flex gap:30px,
// .mb-20's margin-bottom:20px, etc - note these px-suffixed utility names
// are 1:1 pixel values there, not Tailwind's own same-named rem scale) -
// same porting approach as Button.tsx's own variant classes.
export function PromoSplit({
  heading,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = '',
  imageOnRight = true,
  background = '',
  imagePlain = false,
}: PromoSplitProps) {
  const hasImage = Boolean(imageUrl);

  const textColumn = (
    <div>
      <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
      {description && <p className="text-base leading-[1.3] text-brand-blue">{description}</p>}
      {(primaryCta || secondaryCta) && (
        <div className="mt-[50px] flex flex-wrap items-center gap-[30px]">
          {primaryCta && <Button href={primaryCta.url}>{primaryCta.label}</Button>}
          {secondaryCta && (
            <Button href={secondaryCta.url} variant="brand-secondary">
              {secondaryCta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // `imagePlain` is opt-in (default false keeps every existing
  // promoSplitBlock instance's blob crop unchanged) - the Tech Deals
  // catalogue/SIM promo images are real posters with their own logo/text
  // right up to the edges, which BlobImage's asymmetric crop cuts into.
  // Sits the full, uncropped image on a plain white rounded card instead.
  const imageColumn = hasImage && (
    <div className="relative w-full">
      {imagePlain ? (
        <Card className="mx-auto w-full max-w-xs rounded-[30px] bg-card p-4 py-4 shadow-brand-hover ring-0">
          <LazyImage className="block w-full object-contain" src={imageUrl} alt={imageAlt} />
        </Card>
      ) : (
        <BlobImage src={imageUrl} alt={imageAlt} />
      )}
    </div>
  );

  return (
    // `background` is opt-in (see PromoSplitProps above) - every instance
    // seeded before Tech Deals leaves it unset, so this keeps their exact
    // original margin-based spacing/no background. Only when a page
    // explicitly sets one (currently only Tech Deals' two promo sections)
    // does spacing switch to padding, so the colour band fills the full
    // section instead of stopping short of the margin gap.
    <section className={background ? `py-[40px] sm:py-[120px] ${background}` : 'my-[40px] sm:my-[120px]'}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${hasImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
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
