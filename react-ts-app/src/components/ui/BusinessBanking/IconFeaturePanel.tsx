import { ArrowRight } from 'lucide-react';
import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';
import { Card, CardContent } from '../card';

export interface IconFeaturePanelProps {
  iconUrl?: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string } | null;
  imageUrl?: string;
  imageAlt?: string;
  imageOnRight?: boolean;
  background?: string;
}

// One of the Business Banking page's icon-led feature panels
// (cardIconFeature, CMS-driven, this page only - see
// cms/renderPageSection.tsx) - a single rounded card holding both an icon
// + heading + rich-text body + button AND the photo, side by side (not two
// separate elements - the live page's own photo sits inside the same
// card's padding, not overflowing past its edges). Used twice on the live
// page (MSME Access to Finance Report, Book A Banker) - neither instance
// is a repeating list under a shared heading the way
// businessOfferingsBlock's cards are, so this renders directly as its own
// page section rather than through a wrapping Block List.
//
// cta is optional - the live "Book A Banker" panel has no real link yet
// (its own button is a disabled "Coming soon", not a real destination),
// so a missing cta renders that same disabled label rather than no button
// at all.
export function IconFeaturePanel({
  iconUrl,
  heading,
  bodyHtml,
  cta,
  imageUrl,
  imageAlt = '',
  imageOnRight = true,
  background = '',
}: IconFeaturePanelProps) {
  const hasImage = Boolean(imageUrl);

  const textColumn = (
    <div>
      <div className="flex items-center gap-6">
        {iconUrl && <img src={iconUrl} alt="" className="h-10 w-10 shrink-0" loading="lazy" />}
        <h3 className="text-[24px] font-semibold text-brand-navy">{heading}</h3>
      </div>

      <div className="my-8 h-px w-full bg-brand-green" />

      {bodyHtml && (
        <div
          className="space-y-4 text-base leading-[24px] text-brand-navy [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      <div className="mt-10">
        {cta ? (
          <Button href={cta.url} className="gap-2">
            {cta.label}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center justify-center rounded-[32px] bg-brand-green px-[20px] py-[10px] text-sm font-bold text-white opacity-60">
            Coming soon
          </span>
        )}
      </div>
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
