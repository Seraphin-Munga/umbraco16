// Placeholder content service for the "The 12% Loan" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface TwelvePercentLoanContent {
  title: string;
  description: string;
}

export async function fetchTwelvePercentLoanContent(): Promise<TwelvePercentLoanContent> {
  return {
    title: 'The 12% Loan',
    description: 'From R2 000 to R50 000, over 9 to 24 months',
  };
}
