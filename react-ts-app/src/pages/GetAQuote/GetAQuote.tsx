import { useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { LoanAmountModal } from './LoanAmountModal';

// Ported from the "#step1" section of Platform/Web/Views/newQQ.cshtml (the
// live "/en/home/get-a-quote/" product picker) - the first screen of the
// multi-step quick-quote wizard. Only this product-selection step was
// asked for; the rest of that ~1500 line wizard (amount modal aside) isn't
// built here yet - see LoanAmountModal.tsx's own comment on onGetStarted.
//
// Styling (.card-upsale, .major-title/.span-major-title, .model_overlay,
// .calculator-form, etc.) comes from Home.css, already loaded globally
// since Home.tsx imports it and App.tsx always mounts Home - see
// LoanCalculator.tsx's identical comment on relying on that.
interface QuoteCard {
  id: string;
  title: string;
  description: string;
  href?: string;
}

const QUOTE_CARDS: QuoteCard[] = [
  {
    id: 'borrow',
    title: 'Personal Loan and Credit Card',
    description:
      'When life happens, you deserve peace of mind. Get a fixed term loan up to R500 000.',
  },
  {
    id: 'saveandinvest',
    title: 'MyWorld Bank Account',
    description:
      'Open an account that grows with you. Enjoy lower banking fees, and instant transfers.',
    href: '/en/home/banking/#MyWorld',
  },
  {
    id: 'invest',
    title: 'Investment Account',
    description:
      'Make your money work with you. Start investing today and grow towards the future you deserve.',
    href: '/en/home/product-fixed-deposit-investment/#myCalculator',
  },
  {
    id: 'funeral',
    title: 'Funeral Cover',
    description:
      'Protect your loved ones with dignity. Get a reliable funeral cover that backs you.',
    href: '/en/home/product-funeral-cover/#funeral-calculator',
  },
  {
    id: 'isiko',
    title: 'Isiko',
    description:
      'Build a future that reflects who you are. An account designed for community.',
    href: 'https://www.africanbank.co.za/en/home/Isiko',
  },
];

export function GetAQuote() {
  const [amountModalOpen, setAmountModalOpen] = useState(false);

  return (
    <>
      <section
        id="step1"
        className="step active mtb-30"
        aria-labelledby="bank-with-audacity"
      >
        <div className="container">
          <div className="row">
            <div className="col-xs-12 mb-30">
              <h1>
                <span className="major-title">Select a Product</span>
                <br />
                <span className="span-major-title">that's best for you!</span>
              </h1>
            </div>
          </div>

          <div className="row">
            {QUOTE_CARDS.map((card) => (
              <div
                className="col-xs-12 col-sm-4 col-md-4 mb-30"
                role="listitem"
                key={card.id}
              >
                <div
                  className="card-upsale"
                  role="region"
                  aria-labelledby={`card-${card.id}`}
                >
                  <div className="title">
                    <h4 id={`card-${card.id}`} className="color-brand-1">
                      {card.title}
                    </h4>
                  </div>
                  <div className="description" aria-label="Description">
                    <p className="font-sm-2 color-brand-1">
                      {card.description}
                    </p>
                  </div>
                  <div>
                    {card.href ? (
                      <Button
                        href={card.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Apply now for a ${card.title}`}
                      >
                        Apply
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setAmountModalOpen(true)}
                        aria-label={`Apply now for a ${card.title}`}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div
              className="col-xs-12 col-sm-4 col-md-4 mb-30"
              role="listitem"
            />
          </div>
        </div>
      </section>

      <LoanAmountModal
        open={amountModalOpen}
        onClose={() => setAmountModalOpen(false)}
        onGetStarted={() => setAmountModalOpen(false)}
      />
    </>
  );
}
