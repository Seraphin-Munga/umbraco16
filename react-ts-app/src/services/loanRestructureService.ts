// Placeholder content service for the "loan restructure" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface LoanRestructureContent {
  title: string;
  description: string;
}

export async function fetchLoanRestructureContent(): Promise<LoanRestructureContent> {
  return {
    title: 'loan restructure',
    description: 'We can help you take control of your debt and manage your finances better',
  };
}
