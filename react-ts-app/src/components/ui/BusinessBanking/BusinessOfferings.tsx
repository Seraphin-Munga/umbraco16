import { ArrowRight } from 'lucide-react';
import { Button } from '../Button/Button';
import type { AudacityCard } from '../../Home/BankWithAudacity';

export interface BusinessOfferingsProps {
  heading: string;
  cards: AudacityCard[];
}

// "Our offerings" (businessOfferingsBlock, CMS-driven, Business Banking
// page only - see cms/renderPageSection.tsx) - a left-aligned heading
// above a row of small cards (Bank/Borrow/Invest on the live page), each a
// title, a green divider, a short description, and an Explore button. cards
// reuses AudacityCard (title/description/buttonLabel/buttonUrl) - the same
// shape cardOffering's own CMS properties already match.
export function BusinessOfferings({ heading, cards }: BusinessOfferingsProps) {
  if (cards.length === 0) return null;

  return (
    <section className="bg-white pt-16 pb-6">
      {heading && (
        <h1 className="mx-auto mb-10 max-w-7xl px-4 text-[24px] font-semibold text-brand-navy sm:px-6 sm:text-[30px] lg:px-8">
          {heading}
        </h1>
      )}

      <div className="bg-brand-mist py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-8 px-4 sm:px-6 lg:px-8">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex w-full max-w-[344px] flex-col justify-between rounded-lg bg-white p-5 text-left shadow-[0_9px_18px_0_rgba(0,0,0,0.15)]"
            >
              <div>
                <h3 className="text-[24px] font-semibold text-brand-navy">{card.title}</h3>
                <div className="my-[10px] h-px w-full bg-brand-green" />
                <p className="text-base text-brand-navy">{card.description}</p>
              </div>

              {card.buttonUrl !== '#' && (
                <div className="mt-6">
                  <Button href={card.buttonUrl} className="gap-2">
                    {card.buttonLabel}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
