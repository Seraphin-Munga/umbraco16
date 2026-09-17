import { fetchTopNavigation } from '../api/contentApi';
import type { TopNavigation } from '../api/contentApi';

// Thin wrapper around contentApi.ts's fetchTopNavigation so Header.tsx goes
// through the same service+slice shape as every other component's data
// fetch, instead of calling the Delivery API client directly.
export type HeaderContent = TopNavigation;

export async function fetchHeaderContent(signal?: AbortSignal): Promise<HeaderContent> {
  return fetchTopNavigation(signal);
}
