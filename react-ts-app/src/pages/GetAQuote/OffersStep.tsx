import {
  estimateMonthlyInstallment,
  formatRand,
} from '../../utils/loanCalculator';
import { btnPrimary, btnTertiary, tooltipCardClass } from './styles';

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
    <div
      id="step3"
      className="animate-[get-a-quote-slide-up_0.5s_ease-in-out]"
    >
      <div id="personaloanoffers">
        <h1
          id="loanOfferTitle"
          className="mb-5 mt-[15px] text-center text-[30px] text-brand-navy"
        >
          Great News! You Qualify - view your{' '}
          <span className="text-[#5dc300]">
            personalised loan quick quote
          </span>{' '}
          below.
        </h1>
        <p id="qqtitle" className="mb-5 text-center text-base text-brand-navy">
          Please note: This is a quick, estimated quote based on the information
          provided. The final amount and rates may vary upon a detailed
          assessment of your profile, needs and requirements.
        </p>

        <div className="flex-1 overflow-y-auto p-2.5" id="offersContainer">
          <div
            className="mt-[15px] grid grid-cols-2 gap-[15px] max-[480px]:flex max-[480px]:flex-col"
            id="productGrid"
          >
            <div className="mx-auto flex w-[250px] cursor-pointer flex-col rounded-[10px] bg-[#fff] text-center shadow-[rgba(50,50,105,0.1)_0px_2px_15px_0px,rgba(0,0,0,0.05)_0px_1px_1px_0px] transition-transform duration-300">
              <div className="bg-brand-navy p-3 font-bold text-white">
                <div className="text-white">African Bank</div>
                <div className="text-[10px] text-white">Personal Loan</div>
              </div>
              <div className="p-3 pt-7">
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
              <div className="p-3 text-center">
                <span
                  className={tooltipCardClass}
                  data-tooltip="Rates and final amount are confirmed after a full assessment."
                >
                  Estimated quote
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-5 mt-2.5 text-center text-base text-brand-navy">
            To continue your loan application and begin the final assessment
            process, please register or log in to your account.
          </p>
        </div>

        <div id="newCustomer">
          <div className="mt-[31px] flex justify-center gap-5 max-sm:grid max-sm:justify-center max-sm:gap-2.5 max-sm:text-center">
            <a
              className={btnTertiary}
              href="/en/home/product-personal-loan"
            >
              Close
            </a>
            <a
              className={btnPrimary}
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
