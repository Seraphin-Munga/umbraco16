// Placeholder content service for the "PayShap" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface PayShapContent {
  title: string;
  description: string;
}

export async function fetchPayShapContent(): Promise<PayShapContent> {
  return {
    title: 'PayShap',
    description: 'Use PayShap to make instant payments.',
  };
}
