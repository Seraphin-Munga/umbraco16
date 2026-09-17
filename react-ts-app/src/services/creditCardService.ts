// Placeholder content service for the "Black credit card" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface CreditCardContent {
  title: string;
  description: string;
}

export async function fetchCreditCardContent(): Promise<CreditCardContent> {
  return {
    title: 'Black credit card',
    description: 'Get the Credit Card that suits your lifestyle',
  };
}
