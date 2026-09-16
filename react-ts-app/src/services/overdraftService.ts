// Placeholder content service for the "Overdraft" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface OverdraftContent {
  title: string;
  description: string;
}

export async function fetchOverdraftContent(): Promise<OverdraftContent> {
  return {
    title: 'Overdraft',
    description: 'Apply for Ovedraft',
  };
}
