// Placeholder content service for the "Fixed deposits" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface FixedDepositsContent {
  title: string;
  description: string;
}

export async function fetchFixedDepositsContent(): Promise<FixedDepositsContent> {
  return {
    title: 'Fixed deposits',
    description: 'Make a single deposit for 3 to 60 months',
  };
}
