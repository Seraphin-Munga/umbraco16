// Ported verbatim from personalLoanCampaign.cshtml's `installmentEstimator`
// JS function - the only place in the source that actually computes a loan
// repayment (LoanCalculator.tsx used to just display a static value since
// no formula had been found yet). `vat` and `repo` are declared in the
// source function too but never used in the actual computation - dropped
// here rather than carried along unused.
export function estimateMonthlyInstallment(loanAmount: number, termMonths: number): number {
  const interestRate = 0.2475;
  const insurancePremium = 0.0045;
  const initiationFee = Math.max(Math.min(Math.min(165 + (loanAmount - 1000) * 0.1, 1050), loanAmount * 0.15), 0);
  const principalDebt = loanAmount + initiationFee * 1.15;
  const serviceFee = 60 * 1.15;

  return (
    (principalDebt * interestRate) / 12 / (1 - 1 / Math.pow(1 + interestRate / 12, termMonths)) +
    insurancePremium * principalDebt +
    serviceFee
  );
}

// Matches the source's own formatting: Intl-formatted ZAR, "ZAR" swapped
// for "R", comma group separators swapped for spaces (e.g. "R 2 000.00").
export function formatRand(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R ${formatted.replace(/,/g, ' ')}`;
}
