// Placeholder content service for the "Consolidation Loan" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface ConsolidationLoanContent {
  title: string;
  description: string;
}

export async function fetchConsolidationLoanContent(): Promise<ConsolidationLoanContent> {
  return {
    title: 'Consolidation Loan',
    description: 'Consolidate your debt with lower repayments',
  };
}
