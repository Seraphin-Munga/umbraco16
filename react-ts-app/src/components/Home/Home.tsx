import { useEffect, useState } from 'react';
import { fetchHomePage, fetchLatestBlogPosts } from '../../api/contentApi';
import type { BlogPost, HomePageData } from './types';
import { HeroCarousel } from './HeroCarousel';
import { HeroShoulder } from './HeroShoulder';
import { ContentSections } from './ContentSections';
import { BlogSection } from './BlogSection';
import { Testimonials } from './Testimonials';
import './Home.css';

const EMPTY_HOME_PAGE: HomePageData = {
  hero: [],
  shoulder: [],
  sections: [],
  blogHeading: null,
  testimonialsHeading: '',
  testimonials: [],
};

// Ported from PageHome.cshtml (the @RenderBody() content MasterNew.cshtml's
// layout wraps with Header/Footer - see App.tsx). The live-chat button at
// the top is 100% static markup in the source (lines 27-29); its actual
// behavior lives in a third-party widget script this app doesn't load, so
// it's kept here purely as inert markup, same as elsewhere on this page
// where a source behavior has no equivalent yet.
export function Home() {
  const [homePage, setHomePage] = useState<HomePageData>(EMPTY_HOME_PAGE);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchHomePage(controller.signal)
      .then(setHomePage)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    fetchLatestBlogPosts(controller.signal)
      .then(setBlogPosts)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="live-chat">
        <i className="fa fa-comments-o fa-3x" aria-hidden="true" />
      </div>

      <div className="header-section">
        <div className="header-content container text-center">
          <HeroCarousel slides={homePage.hero} />
          <HeroShoulder tabs={homePage.shoulder} />
        </div>
      </div>

      <ContentSections sections={homePage.sections} />

      <BlogSection heading={homePage.blogHeading} posts={blogPosts} />

      <Testimonials heading={homePage.testimonialsHeading} items={homePage.testimonials} />
    </>
  );
}
