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
    <section className="mtb-30" aria-labelledby="bank-with-audacity">
      <div className="container">
        <div className="row">
          <div className="col-xs-12 mb-30">
            <h1
              id="bank-with-audacity"
              className="color-brand-1 major-title mb-20 md-text-center"
              role="heading"
              aria-level={1}
            >
              {heading}
            </h1>
          </div>
        </div>

        <div className="row zoom-in visible">
          {cards.map((card) => (
            <div className="col-xs-12 col-sm-6 col-md-4 mb-30" role="listitem" key={card.id}>
              <div className="card-upsale" role="region" aria-labelledby={`card-${card.id}`}>
                <div className="title">
                  <h4 id={`card-${card.id}`} className="color-brand-1">
                    {card.title}
                  </h4>
                </div>
                <div className="description" aria-label="Description">
                  <p className="font-sm-2 color-brand-1">{card.description}</p>
                </div>
                <div>
                  <p className="primary">
                    <Button
                      href={card.buttonUrl}
                      variant="brand-link"
                      role="button"
                      aria-label={`Apply now for a ${card.title}`}
                    >
                      {card.buttonLabel}
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
