import { useEffect, useState } from 'react';
import { fetchHomePageSections, fetchHomePageSeo } from '../../api/contentApi';
import type { HomePageSection, PageSeo } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';
import { useSeoMeta } from '../../utils/useSeoMeta';


export function Home() {
  const [sections, setSections] = useState<HomePageSection[] | null>(null);
  const [seo, setSeo] = useState<PageSeo | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchHomePageSections(controller.signal)
      .then(setSections)
      .catch((error: unknown) => {

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSections([]);
      });

    fetchHomePageSeo(controller.signal)
      .then(setSeo)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSeo(null);
      });

    return () => controller.abort();
  }, []);

  useSeoMeta({
    title: seo?.title,
    description: seo?.description,
    canonicalUrl: seo?.canonicalUrl,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex,
  });

  return (
    <div id="page">
      <div id="content">
        <main>{sections?.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
