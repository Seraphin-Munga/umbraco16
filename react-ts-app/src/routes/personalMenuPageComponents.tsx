// Maps every PERSONAL_MENU_PAGES path (src/routes/personalMenuPages.ts) to
// its own dedicated page component, so App.tsx can render each route with
// real content as it's ported instead of the generic PagePlaceholder.
import type { ComponentType } from 'react';
import { PersonalLoanPage } from '../pages/PersonalLoanPage/PersonalLoanPage';
import { ConsolidationLoanPage } from '../pages/ConsolidationLoanPage/ConsolidationLoanPage';
import { TwelvePercentLoanPage } from '../pages/TwelvePercentLoanPage/TwelvePercentLoanPage';
import { CreditCardPage } from '../pages/CreditCardPage/CreditCardPage';
import { TechDealsPage } from '../pages/TechDealsPage/TechDealsPage';
import { CreditReportPage } from '../pages/CreditReportPage/CreditReportPage';
import { MyWorldBankingPage } from '../pages/MyWorldBankingPage/MyWorldBankingPage';
import { OverdraftPage } from '../pages/OverdraftPage/OverdraftPage';
import { OnlineBankingPage } from '../pages/OnlineBankingPage/OnlineBankingPage';
import { PayShapPage } from '../pages/PayShapPage/PayShapPage';
import { FixedDepositsPage } from '../pages/FixedDepositsPage/FixedDepositsPage';
import { NoticeDepositsPage } from '../pages/NoticeDepositsPage/NoticeDepositsPage';
import { AccessAccumulatorPage } from '../pages/AccessAccumulatorPage/AccessAccumulatorPage';
import { TaxFreeInvestmentPage } from '../pages/TaxFreeInvestmentPage/TaxFreeInvestmentPage';
import { StokvelPage } from '../pages/StokvelPage/StokvelPage';
import { CreditLifePage } from '../pages/CreditLifePage/CreditLifePage';
import { FuneralPlanPage } from '../pages/FuneralPlanPage/FuneralPlanPage';
import { IsikoPage } from '../pages/IsikoPage/IsikoPage';
import { LoanRestructurePage } from '../pages/LoanRestructurePage/LoanRestructurePage';
import { AudaciousRewardsPage } from '../pages/AudaciousRewardsPage/AudaciousRewardsPage';

export const PERSONAL_MENU_PAGE_COMPONENTS: Record<string, ComponentType> = {
  '/en/home/product-personal-loan/': PersonalLoanPage,
  '/en/home/product-consolidation-loan/': ConsolidationLoanPage,
  '/en/home/product-12-loan/': TwelvePercentLoanPage,
  '/en/home/product-credit-card/': CreditCardPage,
  '/en/home/tech-deals/': TechDealsPage,
  '/en/home/credit-report/': CreditReportPage,
  '/en/home/banking/': MyWorldBankingPage,
  '/en/home/product-overdraft/': OverdraftPage,
  '/en/home/online-banking/': OnlineBankingPage,
  '/en/home/payshap/': PayShapPage,
  '/en/home/product-fixed-deposit-investment/': FixedDepositsPage,
  '/en/home/product-notice-deposit/': NoticeDepositsPage,
  '/en/home/product-access-accumulator/': AccessAccumulatorPage,
  '/en/home/product-tax-free/': TaxFreeInvestmentPage,
  '/en/home/stokvel/': StokvelPage,
  '/en/home/product-credit-life/': CreditLifePage,
  '/en/home/product-funeral-cover/': FuneralPlanPage,
  '/en/home/isiko/': IsikoPage,
  '/en/home/loan-restructure/': LoanRestructurePage,
  '/en/home/audacious-rewards/': AudaciousRewardsPage,
};
