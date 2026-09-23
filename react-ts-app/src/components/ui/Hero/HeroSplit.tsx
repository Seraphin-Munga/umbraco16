import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

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
//
// Was previously `.hero-split`/`.container`/`.row`/`.col-xl-6`/`.major-
// title`/`.combo-btn`/etc - see PromoSplit.tsx's own comment for why that
// stylesheet (public/vendor/projectmagic.css) isn't actually loaded, so
// this rendered unstyled. `mt-0` below reproduces the local Hero.css
// override this used to carry (`.hero-split.mtb-120 { margin-top: 0 }`) -
// this always renders first on the page (a hero), so the vertical-margin
// utility's own top half left a gap under the header.
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
    <section className="mt-0 mb-[40px] bg-brand-mist sm:mb-[120px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${hasImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          <div>
            <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">
              {heading}
            </h1>
            {description && <p className="text-base leading-[1.3] text-brand-blue">{description}</p>}
            {(primaryCta || secondaryCta) && (
              <div className="mt-[50px] flex flex-wrap items-center gap-[30px]">
                {primaryCta && <Button href={primaryCta.url}>{primaryCta.label}</Button>}
                {secondaryCta && (
                  <Button href={secondaryCta.url} variant="brand-link">
                    {secondaryCta.label}
                  </Button>
                )}
              </div>
            )}
          </div>

          {hasImage && (
            <div className="relative w-full">
              <BlobImage src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
