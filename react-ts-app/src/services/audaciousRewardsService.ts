// Placeholder content service for the "Audacious Rewards" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface AudaciousRewardsContent {
  title: string;
  description: string;
}

export async function fetchAudaciousRewardsContent(): Promise<AudaciousRewardsContent> {
  return {
    title: 'Audacious Rewards',
    description: 'Get rewarded for everyday banking',
  };
}
