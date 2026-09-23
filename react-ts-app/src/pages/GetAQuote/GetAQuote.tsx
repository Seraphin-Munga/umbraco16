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
import { btnPrimary, btnTertiary } from './styles';

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
    <div className="flex min-h-[89.6vh] flex-col justify-between">
      <WizardHeader step={wizardStep} />

      {wizardStep === 'product' && (
        <section
          id="step1"
          className="my-[30px] animate-[get-a-quote-slide-up_0.5s_ease-in-out]"
          aria-labelledby="bank-with-audacity"
        >
          <div className="mx-auto max-w-[1170px] px-4">
            <div className="mb-[30px] max-md:text-center">
              <h1>
                <span className="text-[52px] leading-[58px] text-brand-navy max-md:text-[28px] max-md:leading-[25px]">
                  Select a Product
                </span>
                <br />
                <span className="text-[52px] italic font-bold leading-[58px] text-brand-navy max-md:text-[28px] max-md:leading-[25px]">
                  that's best for you!
                </span>
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {QUOTE_CARDS.map((card) => (
                <div role="listitem" key={card.id}>
                  <div
                    className="mx-auto flex h-auto min-h-[210px] w-full flex-col justify-between rounded-[20px] border border-[#f2f2f2] bg-[#fff] p-[30px_32px] shadow-[0_1px_15px_0_rgba(0,0,0,0.15)] hover:bg-[#f2f2f2] max-md:my-5 md:p-[30px_20px]"
                    role="region"
                    aria-labelledby={`card-${card.id}`}
                  >
                    <div>
                      <h4
                        id={`card-${card.id}`}
                        className="text-xl font-bold text-brand-navy md:min-h-[46px]"
                      >
                        {card.title}
                      </h4>
                    </div>
                    <div aria-label="Description">
                      <p className="text-sm leading-normal text-brand-navy md:min-h-[100px]">
                        {card.description}
                      </p>
                    </div>
                    <div>
                      {card.href ? (
                        <a
                          className={`${btnPrimary} mt-3.5`}
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
                          className={`${btnPrimary} mt-3.5`}
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
            </div>
          </div>
        </section>
      )}

      {wizardStep === 'details' && (
        <div className="mx-auto my-5 max-w-[857px] animate-[get-a-quote-fade-in_0.5s_ease-in] px-10 text-left max-md:px-4 max-md:pb-4 md:max-lg:w-4/5 md:max-lg:px-[15px] md:max-lg:text-sm lg:w-3/5 lg:text-lg">
          <PersonalDetailsStep
            value={personalDetails}
            onChange={setPersonalDetails}
            onOpenExpensesCalculator={() => setExpensiveModalOpen(true)}
          />
        </div>
      )}

      {wizardStep === 'details' && (
        // Ported as a sibling of the details container above, not nested
        // inside it - the source markup (newQQ.cshtml) has this bar as its
        // own top-level block alongside the footer, spanning the full page
        // width rather than the details container's own max-width.
        <div className="flex w-full items-center justify-between bg-[#f8f8f8] px-8 py-3.5 max-md:mt-5 max-md:grid max-md:justify-center max-md:gap-3.5">
          <button
            type="button"
            className={btnTertiary}
            onClick={() => setCancelModalOpen(true)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!isPersonalDetailsComplete(personalDetails)}
            onClick={() => setCreditBureauModalOpen(true)}
          >
            Continue
          </button>
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
