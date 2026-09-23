import { ChevronRight } from 'lucide-react';
import type { AudacityCard } from '../../Home/BankWithAudacity';

export interface CrossSellProps {
  heading: string;
  cards: AudacityCard[];
  imageUrl?: string;
}

// "Find your ideal loan solution" style cross-sell card grid beside a
// photo (crossSellBlock, CMS-driven, any page - see
// cms/renderPageSection.tsx).
//
// Was previously `.section-800`/`.container`/`.row`/`.col-md-6`/`.card-
// offer`/`.btn.btn-default`/etc, styled by public/vendor/projectmagic.css
// - a stylesheet that isn't actually loaded anywhere (see PromoSplit.tsx's
// own comment on that gap), so this rendered unstyled in production.
// Tailwind classes below reproduce its confirmed values (`.card-offer`'s
// padding:20px/border-radius:30px, `.btn.btn-default`'s 40px circle, etc);
// the source's `.btn.btn-default.arrow-right` was an empty anchor with
// only an aria-label and a CSS `content: '❯'` pseudo-element for its
// visible glyph - replaced here with a real ChevronRight icon instead of
// reproducing that pseudo-element trick.
export function CrossSell({ heading, cards, imageUrl }: CrossSellProps) {
  return (
    <section className="flex min-h-[800px] w-full items-center py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${imageUrl ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          <div>
            <h1 className="mt-[15px] mb-[20px] text-brand-ink">{heading}</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {cards.map((card) => (
                <div
                  className="rounded-[30px] border border-brand-mist p-5 pr-[20px] transition-shadow hover:shadow-brand-hover"
                  key={card.id}
                >
                  <h4 className="text-brand-lime">{card.title}</h4>
                  <p className="mb-[15px] text-base leading-[1.2] text-brand-slate">{card.description}</p>
                  <a
                    href={card.buttonUrl}
                    className="flex size-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-brand-icon transition-colors hover:bg-brand-lime hover:text-white"
                    aria-label={card.buttonLabel || card.title}
                  >
                    <ChevronRight className="size-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
          {imageUrl && (
            <div>
              <img className="block w-full" src={imageUrl} alt="" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
