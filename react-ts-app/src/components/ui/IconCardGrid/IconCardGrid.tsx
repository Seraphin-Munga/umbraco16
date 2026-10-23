import { LazyImage } from '../Image/LazyImage';

export interface IconCardItem {
  iconUrl: string;
  title: string;
  description: string;
}

export interface IconCardGridProps {
  heading?: string;
  cards: IconCardItem[];
  background?: string;
}

// Two-column grid of outlined cards, each an icon beside an uppercase title
// and short description (iconCardGridBlock, CMS-driven - see
// cms/renderPageSection.tsx) - ported from the legacy investment pages'
// "card-offer-small card-we-do" grid, e.g. "More About The Notice Deposit".
export function IconCardGrid({ heading, cards, background = '' }: IconCardGridProps) {
  if (cards.length === 0) return null;

  return (
    <section className={`py-12 md:py-20 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <h2 className="mb-8 text-center text-[26px] leading-tight font-bold text-brand-ink md:text-[40px]">
            {heading}
          </h2>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex items-center gap-6 rounded-[30px] border border-brand-ink bg-white px-8 py-8 transition-transform hover:-translate-y-1"
            >
              {card.iconUrl && (
                <LazyImage
                  wrapperClassName="shrink-0"
                  className="block h-auto w-[70px] md:w-[90px]"
                  src={card.iconUrl}
                  alt=""
                />
              )}
              <div>
                <h4 className="text-lg font-bold text-brand-ink md:text-[20px]">{card.title}</h4>
                {card.description && <p className="mt-2 text-base leading-snug text-brand-muted">{card.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
