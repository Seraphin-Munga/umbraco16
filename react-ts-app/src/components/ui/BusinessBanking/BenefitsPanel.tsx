import { ArrowRight } from 'lucide-react';
import { BlobImage } from '../Image/BlobImage';
import { Card, CardContent } from '../card';

export interface BenefitsPanelProps {
  heading: string;
  features: string[];
  imageUrl?: string;
  imageAlt?: string;
  imageOnRight?: boolean;
  background?: string;
}

// "Benefits" (benefitsPanelBlock, CMS-driven - see cms/renderPageSection.tsx)
// - a heading, a green divider, and an arrow-bulleted feature list beside
// a photo, all inside one shared white card (same card look as
// IconFeaturePanel). Each feature string is "Lead-in: rest of the
// sentence" (matches the live page's own bold-lead-in list items) - split
// on the first colon here rather than via CMS rich text, since featureItem
// (reused from create-home-schema) is a single plain-text field, same as
// every other checklist in this app.
function renderFeature(feature: string) {
  const colonIndex = feature.indexOf(':');
  if (colonIndex === -1) return feature;

  const lead = feature.slice(0, colonIndex + 1);
  const rest = feature.slice(colonIndex + 1);

  return (
    <>
      <strong>{lead}</strong>
      {rest}
    </>
  );
}

export function BenefitsPanel({
  heading,
  features,
  imageUrl,
  imageAlt = '',
  imageOnRight = true,
  background = '',
}: BenefitsPanelProps) {
  if (!heading && features.length === 0) return null;

  const hasImage = Boolean(imageUrl);

  const textColumn = (
    <div>
      {heading && <h3 className="text-[24px] font-semibold text-brand-navy">{heading}</h3>}
      <div className="my-8 h-px w-full bg-brand-green" />

      {features.length > 0 && (
        <ul className="space-y-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-base leading-[22px] text-brand-navy">
              <ArrowRight className="mt-1 size-4 shrink-0 text-brand-green" />
              <span>{renderFeature(feature)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const imageColumn = hasImage && (
    <div className="flex justify-center md:justify-end">
      <div className="w-full max-w-[260px]">
        <BlobImage
          src={imageUrl}
          alt={imageAlt}
          wrapperClassName="aspect-[320/335] w-full overflow-hidden rounded-[20px]"
          className="h-full"
        />
      </div>
    </div>
  );

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="rounded-[20px] bg-card shadow-[0_9px_18px_0_rgba(0,0,0,0.15)] ring-0 [--card-spacing:--spacing(8)] sm:[--card-spacing:--spacing(11)]">
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
