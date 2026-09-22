import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "#bank-with-audacity" section of the current live home
// page markup - a static grid of product upsell cards. Content comes from
// the CMS-managed homePage node (see contentApi.ts's fetchHomePageSections)
// - no hardcoded fallback content.
export interface AudacityCard {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonUrl: string;
}

interface BankWithAudacityProps {
  cards: AudacityCard[];
  heading?: ReactNode;
}

export function BankWithAudacity({ cards, heading }: BankWithAudacityProps) {
  return (
    <section className="my-[30px]" aria-labelledby="bank-with-audacity">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1
          id="bank-with-audacity"
          className="mb-[30px] text-center text-[20px] leading-none font-extralight text-brand-ink max-[768px]:text-left sm:text-[65px]"
          role="heading"
          aria-level={1}
        >
          {heading}
        </h1>

        <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 md:grid-cols-3" role="list">
          {cards.map((card) => (
            <div
              className="flex h-[170px] flex-col justify-between rounded-[29px] border border-[#f2f2f2] p-5 shadow-[0_2px_15px_rgba(50,50,105,0.1),0_1px_1px_rgba(0,0,0,0.05)]"
              role="region"
              aria-labelledby={`card-${card.id}`}
              key={card.id}
            >
              <div>
                <h4 id={`card-${card.id}`} className="font-semibold text-brand-ink">
                  {card.title}
                </h4>
              </div>
              <div aria-label="Description">
                <p className="text-sm text-brand-ink">{card.description}</p>
              </div>
              <div>
                <Button
                  href={card.buttonUrl}
                  variant="brand-link"
                  role="button"
                  aria-label={`Apply now for a ${card.title}`}
                >
                  {card.buttonLabel}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
