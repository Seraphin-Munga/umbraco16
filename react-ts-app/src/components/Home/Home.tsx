import { useEffect, useState } from 'react';
import { fetchHomePage, fetchLatestBlogPosts, fetchWhatsNew } from '../../api/contentApi';
import type { BlogPost, HomePageData, WhatsNew } from './types';
import { HeroCarousel } from './HeroCarousel';
import { HeroShoulder } from './HeroShoulder';
import { BankStoryCarousel } from './BankStoryCarousel';
import { Testimonials } from './Testimonials';
import { HelpTabs } from './HelpTabs';
import './Home.css';

const EMPTY_HOME_PAGE: HomePageData = {
  hero: [],
  shoulderTabs: [],
  helpHeading: '',
  helpTabs: [],
  testimonials: [],
};

// Ported from Platform/Web/Views/home.cshtml (the live site's actual
// template - see contentApi.ts's own HOME PAGE section comment for why
// this isn't Platform.Umbraco16/PageHome.cshtml). This is the @RenderBody()
// content Master.cshtml's layout wraps with Header/Footer - see App.tsx.
//
// Not ported: the "panelWarning" banner shown above everything else (a
// CMS-authored warning strip resolved through a `TabBody`/
// `nCTabGenericContent` chain by `partialViewName == "panelWarning"" -
// there's no equivalent content-type research for that chain yet) and the
// call-me-back popup form (commented out in the source itself - "Used for
// popup START" - so it's dead code there too).
export function Home() {
  const [homePage, setHomePage] = useState<HomePageData>(EMPTY_HOME_PAGE);
  const [whatsNew, setWhatsNew] = useState<WhatsNew | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchHomePage(signal)
      .then(setHomePage)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    fetchWhatsNew(signal).then(setWhatsNew);

    fetchLatestBlogPosts(signal)
      .then(setBlogPosts)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    return () => controller.abort();
  }, []);

  return (
    <div id="page">
      <div id="content">
        <main>
          <HeroCarousel slides={homePage.hero} />
          <HeroShoulder tabs={homePage.shoulderTabs} />
          <BankStoryCarousel whatsNew={whatsNew} posts={blogPosts} />
          <Testimonials items={homePage.testimonials} />
        </main>

        <HelpTabs heading={homePage.helpHeading} tabs={homePage.helpTabs} />
      </div>
    </div>
  );
}
