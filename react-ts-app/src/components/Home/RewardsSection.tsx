import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "borrow-section" / Audacious Rewards block of the current
// live home page markup (the "borrow-section" class name is a leftover from
// another section reusing the same background style - the content here is
// entirely about Rewards). Content comes from the CMS-managed homePage node
// (see contentApi.ts's fetchHomePageSections) - no hardcoded fallback
// content.
export interface RewardsCard {
  id: string;
  imageUrl: string;
  imageAlt: string;
  description: ReactNode;
  buttonLabel: string;
  buttonUrl: string;
}

interface RewardsSectionProps {
  cards: RewardsCard[];
  heading?: ReactNode;
  subheading?: ReactNode;
  intro?: ReactNode;
}

export function RewardsSection({ cards, heading, subheading, intro }: RewardsSectionProps) {
  return (
    <section className="-mt-[55px] bg-[#f2f2f2] pt-[100px] pb-5 max-[768px]:-mt-[100px] min-[769px]:pb-[100px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="items-end text-center max-[768px]:text-left md:grid md:grid-cols-2 md:gap-8">
          <div>
            <h1 className="text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
          </div>
          <div>
            <h4 className="mb-5 font-semibold text-brand-ink">{subheading}</h4>
            <p className="text-base text-brand-ink">{intro}</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <div className="flex h-full flex-col justify-between rounded-[29px] bg-white p-[15px]" key={card.id}>
              <div>
                <img className="block" src={card.imageUrl} alt={card.imageAlt} />
                <p className="mt-4 mb-4 text-base text-brand-ink">{card.description}</p>
              </div>
              <div className="text-left">
                <Button href={card.buttonUrl}>{card.buttonLabel}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
