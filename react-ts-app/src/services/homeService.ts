import { fetchHomePage, fetchLatestBlogPosts, fetchWhatsNew } from '../api/contentApi';
import type { BlogPost, HomePageData, WhatsNew } from '../components/Home/types';

// Thin wrapper bundling contentApi.ts's three home-page fetchers into one
// service call, matching the service+slice shape used everywhere else.
// Home.tsx's sections are all static content today (see Home.tsx's own
// comment) - nothing reads this data yet, but it's fetched into the store
// ready for a section to switch over to it.
export interface HomeContent {
  homePage: HomePageData;
  whatsNew: WhatsNew | null;
  blogPosts: BlogPost[];
}

export async function fetchHomeContent(signal?: AbortSignal): Promise<HomeContent> {
  const [homePage, whatsNew, blogPosts] = await Promise.all([
    fetchHomePage(signal),
    fetchWhatsNew(signal),
    fetchLatestBlogPosts(signal),
  ]);

  return { homePage, whatsNew, blogPosts };
}
