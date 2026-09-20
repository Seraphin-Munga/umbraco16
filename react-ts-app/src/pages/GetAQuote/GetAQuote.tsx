import { useState } from 'react';
import { LoanAmountModal } from './LoanAmountModal';
import { CreditQuestionsModal } from './CreditQuestionsModal';
import { CancelModal } from './CancelModal';
import { CreditBureauCheckModal } from './CreditBureauCheckModal';
import { OtpModal } from './OtpModal';
import { ExpensiveModal } from './ExpensiveModal';
import { WizardHeader, type WizardStep } from './WizardHeader';
import { PersonalDetailsStep } from './PersonalDetailsStep';
import {
  EMPTY_PERSONAL_DETAILS,
  isPersonalDetailsComplete,
  type PersonalDetailsForm,
} from './personalDetailsForm';
import { OffersStep } from './OffersStep';

// Ported from Platform/Web/Views/newQQ.cshtml (the live "/en/home/get-a-quote/"
// multi-step quick-quote wizard): product picker -> loan amount -> credit
// questions -> personal details/income/employment -> simulated credit
// bureau check -> OTP verification -> offers.
//
// Built as UI-only: every step/modal here is real React state and
// client-side flow, but nothing calls a backend. The credit bureau check
// and OTP steps simulate what were originally API calls (see
// CreditBureauCheckModal.tsx and OtpModal.tsx's own comments), and the
// offers step shows one illustrative offer computed from the chosen loan
// amount/term rather than fetching real ones (see OffersStep.tsx).
//
// Not built: the "amountModalinv" investment-amount modal (no reachable
// trigger anywhere in the source markup - the Investment Account card
// links out externally instead), and the "active application in progress"
// escape hatch (thankyoumodal + its call-me-back sub-flow) - detecting an
// existing application needs a real backend check, which contradicts the
// UI-only scope here.
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
  const [wizardStep, setWizardStep] = useState<WizardStep>('product');

  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [expensiveModalOpen, setExpensiveModalOpen] = useState(false);
  const [creditBureauModalOpen, setCreditBureauModalOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [loanAmount, setLoanAmount] = useState(2000);
  const [loanTerm, setLoanTerm] = useState(7);
  const [personalDetails, setPersonalDetails] = useState<PersonalDetailsForm>(
    EMPTY_PERSONAL_DETAILS,
  );

  function resetWizard() {
    setWizardStep('product');
    setPersonalDetails(EMPTY_PERSONAL_DETAILS);
    setAmountModalOpen(false);
    setCreditModalOpen(false);
    setExpensiveModalOpen(false);
    setCreditBureauModalOpen(false);
    setOtpModalOpen(false);
  }

  return (
    <div className="parent-container get-a-quote-page">
      <WizardHeader step={wizardStep} />

      {wizardStep === 'product' && (
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
                        <a
                          className="btn btn-primary"
                          href={card.href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Apply now for a ${card.title}`}
                        >
                          Apply
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setAmountModalOpen(true)}
                          aria-label={`Apply now for a ${card.title}`}
                        >
                          Apply
                        </button>
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
      )}

      {wizardStep === 'details' && (
        <div className="qqcontainer">
          <PersonalDetailsStep
            value={personalDetails}
            onChange={setPersonalDetails}
            onOpenExpensesCalculator={() => setExpensiveModalOpen(true)}
          />

          <div className="container buttons">
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!isPersonalDetailsComplete(personalDetails)}
              onClick={() => setCreditBureauModalOpen(true)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {wizardStep === 'offers' && (
        <OffersStep amount={loanAmount} termMonths={loanTerm} />
      )}

      <LoanAmountModal
        open={amountModalOpen}
        onClose={() => setAmountModalOpen(false)}
        onGetStarted={(amount, termMonths) => {
          setLoanAmount(amount);
          setLoanTerm(termMonths);
          setAmountModalOpen(false);
          setCreditModalOpen(true);
        }}
      />

      <CreditQuestionsModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        onContinue={() => {
          setCreditModalOpen(false);
          setWizardStep('details');
        }}
      />

      <ExpensiveModal
        open={expensiveModalOpen}
        onClose={() => setExpensiveModalOpen(false)}
        onSave={(total) =>
          setPersonalDetails((current) => ({
            ...current,
            expenses: String(total),
          }))
        }
      />

      <CreditBureauCheckModal
        key={creditBureauModalOpen ? 'open' : 'closed'}
        open={creditBureauModalOpen}
        onClose={() => setCreditBureauModalOpen(false)}
        onComplete={() => {
          setCreditBureauModalOpen(false);
          setOtpModalOpen(true);
        }}
      />

      <OtpModal
        key={otpModalOpen ? 'open' : 'closed'}
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        phoneNumber={personalDetails.mobile}
        onVerified={() => {
          setOtpModalOpen(false);
          setWizardStep('offers');
        }}
      />

      <CancelModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => {
          setCancelModalOpen(false);
          resetWizard();
        }}
      />
    </div>
  );
}
