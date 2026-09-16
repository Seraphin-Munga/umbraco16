import type { ReactNode } from 'react';

// Ported from the "borrow-section" / Audacious Rewards block of the current
// live home page markup (the "borrow-section" class name is a leftover from
// another section reusing the same background style - the content here is
// entirely about Rewards). Static content passed as props with defaults so
// it stays reusable.
const BASE_URL = 'https://www.africanbank.co.za';

export interface RewardsCard {
  id: string;
  imageUrl: string;
  imageAlt: string;
  description: ReactNode;
  buttonLabel: string;
  buttonUrl: string;
}

const DEFAULT_CARDS: RewardsCard[] = [
  {
    id: 'join',
    imageUrl: `${BASE_URL}/media/ffrbp1wu/screen-assets.png`,
    imageAlt: 'iori',
    description: (
      <>
        Join with ease on our <strong>mobile App</strong>, online banking, USSD or WhatsApp channel.
      </>
    ),
    buttonLabel: 'JOIN TODAY',
    buttonUrl: 'https://www.africanbank.co.za/en/home/audacious-rewards/',
  },
  {
    id: 'earn',
    imageUrl: `${BASE_URL}/media/rxzpfqbj/screen-assets2.png`,
    imageAlt: 'iori',
    description:
      'Simply swipe, tap or transact with your African Bank debit or credit card to earn points. Unlock even more rewards by shopping with our partners.',
    buttonLabel: 'LEARN MORE',
    buttonUrl: 'https://www.africanbank.co.za/en/home/audacious-rewards/',
  },
  {
    id: 'redeem',
    imageUrl: `${BASE_URL}/media/l0ujvwla/screen-assets3.png`,
    imageAlt: 'iori',
    description: (
      <>
        Redeem your Audacious Rewards points on our <strong>online store</strong> for airtime, data, electricity,
        groceries vouchers, and much more, or simply convert them to cash.
      </>
    ),
    buttonLabel: 'LEARN MORE',
    buttonUrl: 'https://www.africanbank.co.za/en/home/audacious-rewards/',
  },
];

interface RewardsSectionProps {
  cards?: RewardsCard[];
}

export function RewardsSection({ cards = DEFAULT_CARDS }: RewardsSectionProps) {
  return (
    <section className="borrow-section">
      <div className="section-title">
        <div className="container">
          <div className="row align-items-end md-text-center">
            <div className="col-md-6">
              <h1 className="color-brand-1 major-title">
                <span className="span-major-title">Rewards </span>
                <br />
                You can count on
              </h1>
            </div>
            <div className="col-md-6">
              <h4 className="color-brand-1 mb-20">Audacious Rewards</h4>
              <p className="font-md color-brand-1">
                Audacious Rewards is African Bank’s <strong>award winning</strong> rewards programme designed to
                reward you for your everyday banking and positive financial behaviour.
              </p>
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
                      <a href={card.buttonUrl} className="btn btn-brand-1 hover-up">
                        {card.buttonLabel}
                      </a>
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
