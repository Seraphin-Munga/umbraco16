// Ported from the "#bank-with-audacity" section of the current live home
// page markup - a static grid of product upsell cards. Content is hardcoded
// (matches the source exactly, including its "Apply now for a REWARDS" /
// "Apply now for a LIFESTYLE" aria-labels even though those two buttons read
// "JOIN NOW") but passed as props with defaults so it stays reusable.
export interface AudacityCard {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonUrl: string;
}

const DEFAULT_CARDS: AudacityCard[] = [
  {
    id: 'borrow',
    title: 'BORROW',
    description: 'Access a world of potential in just a few clicks.',
    buttonLabel: 'APPLY NOW',
    buttonUrl: '/en/home/product-personal-loan/',
  },
  {
    id: 'saveandinvest',
    title: 'SAVE AND INVEST',
    description: 'Grow your wealth with market leading interest rates.',
    buttonLabel: 'APPLY NOW',
    buttonUrl: '/en/home/product-fixed-deposit-investment/',
  },
  {
    id: 'bank',
    title: 'BANK',
    description: 'Enjoy a unique bank account with SA’s lowest banking fees.',
    buttonLabel: 'APPLY NOW',
    buttonUrl: '/en/home/banking/',
  },
  {
    id: 'insure',
    title: 'INSURE',
    description: 'Get essential cover for life’s unexpected moments.',
    buttonLabel: 'APPLY NOW',
    buttonUrl: '/en/home/product-funeral-cover/',
  },
  {
    id: 'rewards',
    title: 'REWARDS',
    description: 'Earn Audacious Rewards for your everyday banking.',
    buttonLabel: 'JOIN NOW',
    buttonUrl: '/en/home/audacious-rewards/',
  },
  {
    id: 'lifestyle',
    title: 'LIFESTYLE',
    description: 'Solutions that seamlessly combine modern financial tools with your needs.',
    buttonLabel: 'JOIN NOW',
    buttonUrl: '/en/home/isiko/',
  },
];

interface BankWithAudacityProps {
  cards?: AudacityCard[];
}

export function BankWithAudacity({ cards = DEFAULT_CARDS }: BankWithAudacityProps) {
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
              <span className="span-major-title">Bank with</span>
              <br />
              audacity
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
                    <a
                      href={card.buttonUrl}
                      className="btn-brand-link hover-up"
                      role="button"
                      aria-label={`Apply now for a ${card.title}`}
                    >
                      {card.buttonLabel}
                    </a>
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
