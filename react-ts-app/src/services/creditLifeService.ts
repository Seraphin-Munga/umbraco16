// Placeholder content service for the "Credit life" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface CreditLifeContent {
  title: string;
  description: string;
}

export async function fetchCreditLifeContent(): Promise<CreditLifeContent> {
  return {
    title: 'Credit life',
    description: 'Cover your loan or credit card debt',
  };
}
