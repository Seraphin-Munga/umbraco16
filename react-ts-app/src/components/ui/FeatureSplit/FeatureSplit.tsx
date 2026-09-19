import { Button } from '../Button/Button';
import '../media-frame.css';

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
    <div className={hasImage ? 'col-xl-6 col-lg-6 col-md-6' : 'col-xl-12 col-lg-12 col-md-12'}>
      <h1 className="color-brand-1 major-title mb-20">{heading}</h1>
      {features.map((feature) => (
        <p className="font-md color-brand-1 mb-20" key={feature.title}>
          <strong>{feature.title} - </strong>
          {feature.description}
        </p>
      ))}
      {cta && (
        <div className="combo-btn mt-30 text-start column1">
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
    <section className="feature-split mtb-120">
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
