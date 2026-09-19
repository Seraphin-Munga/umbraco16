import { Button } from '../Button/Button';
import '../media-frame.css';

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
// cms/renderPageSection.tsx). Reuses Home/MyWorldAccount.tsx's own
// checklist markup/classes (list-ticks-2, inline-checklist, the same
// check-mark SVG) - same visual language, just paired with an image and a
// CTA in one column rather than that section's own two-text-column split.
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
    <div className={hasImage ? 'col-xl-6 col-lg-6 col-md-6' : 'col-xl-12 col-lg-12 col-md-12'}>
      <h1 className="color-brand-1 major-title mb-10">{heading}</h1>
      {subheading && <p className="font-sm color-grey-500 text-uppercase mb-20">{subheading}</p>}
      <div className="mt-20 mb-30 inline-checklist">
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
      {cta && (
        <div className="combo-btn mt-10 text-start column1">
          <p className="combo-btn-text primary">
            <Button href={cta.url}>{cta.label}</Button>
          </p>
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
    <section className="feature-checklist mtb-120">
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
