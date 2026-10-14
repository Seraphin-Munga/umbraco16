import { Button } from '../Button/Button';
import { LazyImage } from '../Image/LazyImage';
import { Card } from '../card';

export interface PlugAndGoCta {
  label: string;
  url: string;
}

export interface PlugAndGoProps {
  heading: string;
  productName: string;
  description?: string;
  bundleLabel?: string;
  priceAmount?: string;
  priceSuffix?: string;
  cta?: PlugAndGoCta | null;
  imageUrl?: string;
  imageAlt?: string;
  background?: string;
}

// Tech Deals' single-product showcase (plugAndGoBlock, CMS-driven, Tech
// Deals page only - see cms/renderPageSection.tsx) - one bordered product
// card (name, data/minutes blurb, bundle name, price, Apply CTA) beside its
// own photo. No equivalent elsewhere in the app - every other product-card
// grid here (CrossSell, FeatureSplit's contentCard) renders several small
// cards, not one single larger one paired with its own image.
export function PlugAndGo({
  heading,
  productName,
  description,
  bundleLabel,
  priceAmount,
  priceSuffix,
  cta,
  imageUrl,
  imageAlt = '',
  background = '',
}: PlugAndGoProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[42px]">
          {heading}
        </h1>

        <Card
          className={`grid grid-cols-1 items-end gap-10 overflow-visible rounded-[30px] bg-card p-6 shadow-none ring-0 sm:p-10 ${hasImage ? 'md:grid-cols-2' : ''}`}
        >
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-bold text-brand-ink">{productName}</h3>
            {description && <p className="mt-1 text-sm text-brand-slate">{description}</p>}
            {bundleLabel && <p className="mt-4 text-sm font-bold text-brand-blue">{bundleLabel}</p>}
            {(priceAmount || priceSuffix) && (
              <p className="mt-2">
                {priceAmount && <span className="text-lg font-bold text-brand-green">{priceAmount} </span>}
                {priceSuffix && <span className="text-sm text-brand-slate">{priceSuffix}</span>}
              </p>
            )}
            {cta && (
              <div className="mt-6">
                <Button href={cta.url}>{cta.label}</Button>
              </div>
            )}
          </div>

          {hasImage && (
            // Negative top margin deliberately pulls the phone up past the
            // card's own top edge (no overflow-hidden on the card above
            // either) - the source design has the photo break out of the
            // card's frame rather than sit fully contained inside it.
            <div className="relative mx-auto -mt-20 flex w-full max-w-[360px] items-end justify-center sm:-mt-28">
              <LazyImage className="block max-h-[520px] w-full object-contain" src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
