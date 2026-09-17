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
    <section className="borrow-section">
      <div className="section-title">
        <div className="container">
          <div className="row align-items-end md-text-center">
            <div className="col-md-6">
              <h1 className="color-brand-1 major-title">{heading}</h1>
            </div>
            <div className="col-md-6">
              <h4 className="color-brand-1 mb-20">{subheading}</h4>
              <p className="font-md color-brand-1">{intro}</p>
            </div>
          </div>

          <div className="row row-eq-height mtb-40">
            {cards.map((card) => (
              <div className="col-md-4 mb-20" key={card.id}>
                <div className="card-offer box">
                  <div className="card-info">
                    <div>
                      <div>
                        <img className="d-block" src={card.imageUrl} alt={card.imageAlt} />
                      </div>
                    </div>
                    <p className="font-md color-brand-1 mb-15">{card.description}</p>
                  </div>
                  <div className="combo-btn mt-50 text-start column1">
                    <p className="combo-btn-text primary">
                      <Button href={card.buttonUrl}>{card.buttonLabel}</Button>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
