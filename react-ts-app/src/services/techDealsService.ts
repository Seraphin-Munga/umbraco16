// Placeholder content service for the "Tech Deals" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface TechDealsContent {
  title: string;
  description: string;
}

export async function fetchTechDealsContent(): Promise<TechDealsContent> {
  return {
    title: 'Tech Deals',
    description: 'Get access to laptops and cellphones from an interest rate of only 12%',
  };
}
