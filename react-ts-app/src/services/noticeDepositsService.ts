// Placeholder content service for the "Notice deposits" page (see
// src/routes/personalMenuPages.ts). No Umbraco content type has been
// confirmed yet for this page, so this resolves to a static stand-in
// shaped like a future API response - swap the body for a real
// src/api/contentApi.ts call once the CMS content type is confirmed.
export interface NoticeDepositsContent {
  title: string;
  description: string;
}

export async function fetchNoticeDepositsContent(): Promise<NoticeDepositsContent> {
  return {
    title: 'Notice deposits',
    description: 'Access your money with 7, 32 or 90 days’ notice',
  };
}
