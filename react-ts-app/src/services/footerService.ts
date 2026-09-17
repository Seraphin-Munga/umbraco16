import { fetchFooter } from '../api/contentApi';
import type { Footer } from '../api/contentApi';

// Thin wrapper around contentApi.ts's fetchFooter so Footer.tsx goes
// through the same service+slice shape as every other component's data
// fetch, instead of calling the Delivery API client directly.
export type FooterContent = Footer;

export async function fetchFooterContent(signal?: AbortSignal): Promise<FooterContent> {
  return fetchFooter(signal);
}
