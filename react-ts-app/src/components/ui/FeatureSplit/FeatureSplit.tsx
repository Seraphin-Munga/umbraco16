import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

export interface FeatureSplitItem {
  title: string;
  description: string;
}

export interface FeatureSplitCta {
  label: string;
  url: string;
}

export interface FeatureSplitProps {
  heading: string;
  features: FeatureSplitItem[];
  cta?: FeatureSplitCta | null;
  imageUrl?: string;
  imageAlt?: string;
  imageOnRight?: boolean;
}

// Two-column feature list (bold-lead lines, not a checklist) beside a
// photo, e.g. "Why Choose MyWORLD?". Backed by featureSplitBlock
// (CMS-driven, any page - see cms/renderPageSection.tsx). See
// FeatureChecklist.tsx for the sibling checkmarked-list variant of this
// same two-column shape.
//
// Was previously `.feature-split`/`.container`/`.row`/`.col-xl-6`/`.major-
// title`/etc - see PromoSplit.tsx's own comment for why that stylesheet
// (public/vendor/projectmagic.css) isn't actually loaded, so this
// rendered unstyled.
export function FeatureSplit({
  heading,
  features,
  cta,
  imageUrl,
  imageAlt = '',
  imageOnRight = false,
}: FeatureSplitProps) {
  const hasImage = Boolean(imageUrl);

  const textColumn = (
    <div>
      <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
      {features.map((feature) => (
        <p className="mb-[20px] text-base leading-[1.3] text-brand-blue" key={feature.title}>
          <strong>{feature.title} - </strong>
          {feature.description}
        </p>
      ))}
      {cta && (
        <div className="mt-[30px] flex flex-wrap items-center gap-[30px]">
          <Button href={cta.url}>{cta.label}</Button>
        </div>
      )}
    </div>
  );

  const imageColumn = hasImage && (
    <div className="relative w-full">
      <BlobImage src={imageUrl} alt={imageAlt} />
    </div>
  );

  return (
    <section className="my-[40px] sm:my-[120px]">
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
