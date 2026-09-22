import { useEffect, useState } from 'react';
import { fetchHomePageSections } from '../../api/contentApi';
import type { HomePageSection } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';
import './Home.css';

// Ported from Platform/Web/Views/home.cshtml (the live site's actual
// template - see contentApi.ts's own HOME PAGE section comment for why
// this isn't Platform.Umbraco16/PageHome.cshtml). This is the @RenderBody()
// content Master.cshtml's layout wraps with Header/Footer - see App.tsx.
//
// Every section renders only from the CMS-managed `homePage` node
// (contentApi.ts's fetchHomePageSections, backed by Program.cs's
// create-home-schema) - no hardcoded fallback content anywhere, so the page
// is blank until an editor authors a Home Page with sections in the
// backoffice. Sections render in the exact order/kind an editor set in
// Umbraco - reordering the page is then a backoffice edit, not a deploy.
// Rendering itself goes through the shared block registry (src/cms/
// renderPageSection.tsx) - the same one DynamicPage.tsx uses for any other
// CMS page - kept as its own component (rather than folded into the
// catch-all route) only because "/en/home/" is a fixed, always-present
// route, not because its rendering differs in any way.
export function Home() {
  const [sections, setSections] = useState<HomePageSection[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchHomePageSections(controller.signal)
      .then(setSections)
      .catch((error: unknown) => {
        // AbortError fires from this same effect's own cleanup under React
        // 18 StrictMode (which mounts every effect twice in dev) - not a
        // real failure, just the first of two invocations being cancelled
        // in favor of the second. See DynamicPage.tsx's own comment on
        // this same pattern for why treating it as a real failure matters
        // there; harmless here since nothing redirects on empty sections,
        // but still wrong to treat a cancelled request as "no content".
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSections([]);
      });

    return () => controller.abort();
  }, []);

  return (
    <div id="page">
      <div id="content">
        <main>{sections?.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
