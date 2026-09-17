// Placeholder content service for the "Tax free investment" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface TaxFreeInvestmentContent {
  title: string;
  description: string;
}

export async function fetchTaxFreeInvestmentContent(): Promise<TaxFreeInvestmentContent> {
  return {
    title: 'Tax free investment',
    description: 'Invest for 12 months or more, without paying tax',
  };
}
