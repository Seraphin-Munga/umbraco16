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
      .catch(() => setSections([]));

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
