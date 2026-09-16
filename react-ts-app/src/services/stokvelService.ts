// Placeholder content service for the "Stokvel" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface StokvelContent {
  title: string;
  description: string;
}

export async function fetchStokvelContent(): Promise<StokvelContent> {
  return {
    title: 'Stokvel',
    description: 'A savings account that allows a group of people to save together to achieve shared goals and dreams.',
  };
}
