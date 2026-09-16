import { configureStore } from '@reduxjs/toolkit';
import personalLoanReducer from './slices/personalLoanSlice';
import consolidationLoanReducer from './slices/consolidationLoanSlice';
import twelvePercentLoanReducer from './slices/twelvePercentLoanSlice';
import creditCardReducer from './slices/creditCardSlice';
import techDealsReducer from './slices/techDealsSlice';
import creditReportReducer from './slices/creditReportSlice';
import myWorldBankingReducer from './slices/myWorldBankingSlice';
import overdraftReducer from './slices/overdraftSlice';
import onlineBankingReducer from './slices/onlineBankingSlice';
import payShapReducer from './slices/payShapSlice';
import fixedDepositsReducer from './slices/fixedDepositsSlice';
import noticeDepositsReducer from './slices/noticeDepositsSlice';
import accessAccumulatorReducer from './slices/accessAccumulatorSlice';
import taxFreeInvestmentReducer from './slices/taxFreeInvestmentSlice';
import stokvelReducer from './slices/stokvelSlice';
import creditLifeReducer from './slices/creditLifeSlice';
import funeralPlanReducer from './slices/funeralPlanSlice';
import isikoReducer from './slices/isikoSlice';
import loanRestructureReducer from './slices/loanRestructureSlice';
import audaciousRewardsReducer from './slices/audaciousRewardsSlice';

export const store = configureStore({
  reducer: {
    personalLoan: personalLoanReducer,
    consolidationLoan: consolidationLoanReducer,
    twelvePercentLoan: twelvePercentLoanReducer,
    creditCard: creditCardReducer,
    techDeals: techDealsReducer,
    creditReport: creditReportReducer,
    myWorldBanking: myWorldBankingReducer,
    overdraft: overdraftReducer,
    onlineBanking: onlineBankingReducer,
    payShap: payShapReducer,
    fixedDeposits: fixedDepositsReducer,
    noticeDeposits: noticeDepositsReducer,
    accessAccumulator: accessAccumulatorReducer,
    taxFreeInvestment: taxFreeInvestmentReducer,
    stokvel: stokvelReducer,
    creditLife: creditLifeReducer,
    funeralPlan: funeralPlanReducer,
    isiko: isikoReducer,
    loanRestructure: loanRestructureReducer,
    audaciousRewards: audaciousRewardsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
