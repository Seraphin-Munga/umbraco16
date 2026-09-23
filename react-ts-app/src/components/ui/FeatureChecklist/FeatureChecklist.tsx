import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

export interface FeatureChecklistCta {
  label: string;
  url: string;
}

export interface FeatureChecklistProps {
  heading: string;
  subheading?: string;
  features: string[];
  cta?: FeatureChecklistCta | null;
  imageUrl?: string;
  imageAlt?: string;
  imageOnRight?: boolean;
}

// Two-column checkmarked feature list beside a photo, with its own eyebrow
// subheading and CTA, e.g. "What is a Pocket Account". Backed by
// featureChecklistBlock (CMS-driven, any page - see
// cms/renderPageSection.tsx). Same checklist visual language as
// Home/MyWorldAccount.tsx's own list (a two-column wrap of ticked items),
// just paired with an image and a CTA in one column rather than that
// section's own two-text-column split.
//
// Was previously `.feature-checklist`/`.container`/`.row`/`.col-xl-6`/
// `.major-title`/`.list-ticks`/etc - see PromoSplit.tsx's own comment for
// why that stylesheet (public/vendor/projectmagic.css) isn't actually
// loaded, so this rendered unstyled. Tailwind classes below reproduce its
// confirmed values (`.list-ticks li`'s width:50%/margin-bottom:8px, the
// checkmark svg's color:#112768, etc).
export function FeatureChecklist({
  heading,
  subheading,
  features,
  cta,
  imageUrl,
  imageAlt = '',
  imageOnRight = false,
}: FeatureChecklistProps) {
  const hasImage = Boolean(imageUrl);

  const textColumn = (
    <div>
      <h1 className="mb-[10px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
      {subheading && <p className="mb-[20px] text-sm font-normal text-brand-slate uppercase">{subheading}</p>}
      <div className="mt-[20px] mb-[30px]">
        <ul className="flex flex-wrap">
          {features.map((feature) => (
            <li
              key={feature}
              className="mb-[8px] flex w-1/2 items-center gap-[10px] text-[14px] leading-[18px] text-brand-slate"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="shrink-0 text-brand-ink"
                viewBox="0 0 16 16"
              >
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      {cta && (
        <div className="mt-[10px] flex flex-wrap items-center gap-[30px]">
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
