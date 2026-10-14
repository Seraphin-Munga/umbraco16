import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LazyImage } from '../Image/LazyImage';
import { Card, CardContent } from '../card';

export interface RequirementItem {
  iconUrl: string;
  label: string;
}

export interface BenefitCard {
  iconUrl: string;
  heading: string;
  description: string;
}

export interface TechRequirementsProps {
  heading: string;
  bodyHtml: string;
  itemsHeading?: string;
  itemsIntro?: string;
  items: RequirementItem[];
  perksHeading?: string;
  perks: BenefitCard[];
  background?: string;
}

// Tech Deals' "why/how to apply" section (techRequirementsBlock, CMS-
// driven, Tech Deals page only - see cms/renderPageSection.tsx). One block
// rather than two deliberately - the source design nests the grey "Choose
// our tech credit..." perks card inside this same white section rather
// than running it as its own full-width band, so `perks` renders as an
// inner card here instead of a separate top-level section in
// renderPageSection.tsx.
export function TechRequirements({
  heading,
  bodyHtml,
  itemsHeading,
  itemsIntro,
  items,
  perksHeading,
  perks,
  background = '',
}: TechRequirementsProps) {
  const perksTrackRef = useRef<HTMLDivElement>(null);

  const scrollPerks = (direction: 1 | -1) => {
    perksTrackRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[42px]">
          {heading}
        </h1>

        {bodyHtml && (
          <div
            className="rich-text-ticks max-w-3xl [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-brand-ink [&_li]:mb-1 [&_li]:text-sm [&_li]:text-brand-slate [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {items.length > 0 && (
          <div className="mt-10">
            {itemsHeading && <h3 className="text-lg font-bold text-brand-ink">{itemsHeading}</h3>}
            {itemsIntro && <p className="mt-1 text-sm text-brand-slate">{itemsIntro}</p>}

            <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex flex-col items-center text-center">
                  {item.iconUrl && <LazyImage className="mb-3 size-16 object-contain" src={item.iconUrl} alt="" />}
                  <p className="text-xs text-brand-slate">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {perks.length > 0 && (
          <Card className="mt-10 rounded-[20px] bg-brand-mist ring-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(10)]">
            <CardContent>
              {perksHeading && <h2 className="mb-6 text-xl font-bold text-brand-ink">{perksHeading}</h2>}

              <div ref={perksTrackRef} className="flex gap-6 overflow-x-auto scroll-smooth">
                {perks.map((perk, index) => (
                  <Card
                    key={`${perk.heading}-${index}`}
                    className="min-w-[220px] flex-1 rounded-[20px] bg-card text-center ring-0 [--card-spacing:--spacing(6)]"
                  >
                    <CardContent>
                      <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-brand-mist">
                        {perk.iconUrl && <LazyImage className="size-14 object-contain" src={perk.iconUrl} alt="" />}
                      </div>
                      <p className="text-sm font-bold tracking-wide text-brand-ink uppercase">{perk.heading}</p>
                      {perk.description && <p className="mt-2 text-xs text-brand-slate">{perk.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {perks.length > 1 && (
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => scrollPerks(-1)}
                    className="flex size-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-brand-icon transition-colors hover:bg-brand-lime hover:text-white"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => scrollPerks(1)}
                    className="flex size-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-brand-icon transition-colors hover:bg-brand-lime hover:text-white"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
