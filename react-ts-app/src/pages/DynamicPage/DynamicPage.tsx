import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchPageSectionsByRoute } from '../../api/contentApi';
import type { AnyPageSection } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';

// Catch-all route (see App.tsx's final <Route path="*">) for any Umbraco
// page that isn't already explicitly registered in
// personalMenuPageComponents.tsx. Asks the Delivery API "what's at this
// exact URL", and if it's a document type built the same way
// create-home-schema/create-product-loan-schema build one (a single
// "sections" Block List using block Element Types this app already knows
// how to render - see src/cms/renderPageSection.tsx), it renders
// immediately - no new route, component, or deploy needed for a page an
// editor creates in the backoffice going forward, as long as it's composed
// from existing (or already-registered new) block types.
//
// Falls back to redirecting home if nothing exists at this route, or if it
// exists but has no sections - same behavior the old blanket catch-all in
// App.tsx had for any unmatched path.
export function DynamicPage() {
  const location = useLocation();
  const [sections, setSections] = useState<AnyPageSection[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setSections(null);
    setNotFound(false);

    const controller = new AbortController();

    fetchPageSectionsByRoute(location.pathname, controller.signal)
      .then((result) => {
        if (!result || result.sections.length === 0) {
          setNotFound(true);
          return;
        }

        setSections(result.sections);
      })
      .catch(() => setNotFound(true));

    return () => controller.abort();
  }, [location.pathname]);

  if (notFound) {
    return <Navigate to="/en/home/" replace />;
  }

  return (
    <div id="page">
      <div id="content">
        <main>{sections?.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
