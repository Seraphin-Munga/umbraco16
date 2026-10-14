import { Download } from 'lucide-react';
import { BlobImage } from '../Image/BlobImage';
import { Card, CardContent } from '../card';

export interface PricingGuideLink {
  label: string;
  fileUrl: string;
}

export interface PricingGuideProps {
  heading: string;
  links: PricingGuideLink[];
  imageUrl?: string;
  imageAlt?: string;
  background?: string;
}

// "Pricing guide" downloads list beside a photo (pricingGuideBlock, CMS-
// driven - see cms/renderPageSection.tsx) - its own dedicated type rather
// than reusing downloadsSectionBlock, which already has its own different
// look on Home (see businessHeroCarouselBlock's own comment for why a
// shared alias can't carry two different visuals). A link with no file
// attached yet still renders (greyed out, not clickable) rather than
// disappearing, so an editor can see every expected link and knows which
// ones still need a file.
export function PricingGuide({ heading, links, imageUrl, imageAlt = '', background = '' }: PricingGuideProps) {
  if (links.length === 0) return null;

  const hasImage = Boolean(imageUrl);

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="mb-8 text-[24px] font-semibold text-brand-navy">{heading}</h2>}

        {/* One full-width card, not a two-column split - the photo sits
            inside it, overlapping its own right edge (and spilling past
            the card's top/bottom on a tall enough photo), rather than
            living in a separate column beside it. `relative` + no
            overflow-hidden on the card itself is what lets the
            absolutely-positioned image bleed past its edges like that. */}
        <Card className="relative overflow-visible rounded-[20px] bg-card shadow-[0_9px_18px_0_rgba(0,0,0,0.15)] ring-0 [--card-spacing:--spacing(8)] sm:[--card-spacing:--spacing(11)]">
          <CardContent className={hasImage ? 'sm:pr-[280px]' : ''}>
            <ul className="max-w-md space-y-4">
              {links.map((link) =>
                link.fileUrl ? (
                  <li key={link.label}>
                    <a
                      href={link.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-brand-green underline"
                    >
                      {link.label}
                      <Download className="size-4" />
                    </a>
                  </li>
                ) : (
                  <li key={link.label} className="flex items-center gap-2 text-sm font-semibold text-brand-slate">
                    {link.label}
                    <Download className="size-4" />
                  </li>
                ),
              )}
            </ul>

            {hasImage && (
              <div className="mt-8 w-full max-w-[220px] sm:absolute sm:top-1/2 sm:right-10 sm:mt-0 sm:w-[220px] sm:-translate-y-1/2">
                {/* Fixed aspect ratio reserves the height immediately, so
                    nothing jumps once this lazy-loaded photo finishes
                    loading - see BlobImage's own comment on
                    wrapperClassName. */}
                <BlobImage src={imageUrl} alt={imageAlt} wrapperClassName="aspect-[320/335] w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
