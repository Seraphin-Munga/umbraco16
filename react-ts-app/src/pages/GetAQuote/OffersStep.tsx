import {
  estimateMonthlyInstallment,
  formatRand,
} from '../../utils/loanCalculator';

// Ported from "#step3" in Platform/Web/Views/newQQ.cshtml - the offers
// grid. The real page populated #productGrid from a GetOffers API call
// (see quick-loans.service.ts's getOffers on the backend side); with no
// backend wired up here (UI-only per scope), this shows a single
// illustrative offer built from the amount/term chosen in the loan-amount
// step rather than a fabricated multi-lender marketplace.
interface OffersStepProps {
  amount: number;
  termMonths: number;
}

export function OffersStep({ amount, termMonths }: OffersStepProps) {
  const monthlyRepayment = estimateMonthlyInstallment(amount, termMonths);

  return (
    <div id="step3" className="step active">
      <div id="personaloanoffers">
        <h1
          id="loanOfferTitle"
          className="color-brand-1 mt-15 mb-20 text-center"
        >
          Great News! You Qualify - view your{' '}
          <span className="offer-title-heading">
            personalised loan quick quote
          </span>{' '}
          below.
        </h1>
        <p id="qqtitle" className="font-md color-brand-1 mb-20 text-center">
          Please note: This is a quick, estimated quote based on the information
          provided. The final amount and rates may vary upon a detailed
          assessment of your profile, needs and requirements.
        </p>

        <div className="offers-container" id="offersContainer">
          <div className="product-grid" id="productGrid">
            <div className="product-card">
              <div className="card-header">
                <div className="cardheading">African Bank</div>
                <div className="cardheading1">Personal Loan</div>
              </div>
              <div className="card-body">
                <p>
                  Amount: <strong>{formatRand(amount)}</strong>
                </p>
                <p>
                  Term: <strong>{termMonths} months</strong>
                </p>
                <p>
                  Monthly repayment:{' '}
                  <strong>{formatRand(monthlyRepayment)}</strong>
                </p>
              </div>
              <div className="card-footer">
                <span
                  className="tooltip"
                  data-tooltip="Rates and final amount are confirmed after a full assessment."
                >
                  Estimated quote
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="declaration">
          <p className="font-md color-brand-1 mt-10 mb-20 text-center">
            To continue your loan application and begin the final assessment
            process, please register or log in to your account.
          </p>
        </div>

        <div id="newCustomer" className="register-section">
          <div className="footer-declare">
            <a
              className="btn btn-tertiary"
              href="/en/home/product-personal-loan"
            >
              Close
            </a>
            <a
              className="btn btn-primary"
              href="https://ib.africanbank.co.za/Modules/Subscription/Controls/AB/Onboarding/ABOnboarding.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Finish Registration and apply
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
