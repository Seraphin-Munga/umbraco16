import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
// Renders blank (stays on the requested URL) rather than redirecting home
// when there's nothing to show - deliberately, not a placeholder to fix
// later. An earlier version redirected to "/en/home/" here, which made
// every legacy page still on the old pageLoans content type (e.g.
// /en/home/product-personal-loan/, /en/home/product-consolidation-loan/ -
// real, live pages, just not yet migrated to this system) bounce back to
// Home on every visit instead of just showing nothing at that URL.
export function DynamicPage() {
  const location = useLocation();
  const [sections, setSections] = useState<AnyPageSection[]>([]);

  useEffect(() => {
    setSections([]);

    const controller = new AbortController();

    fetchPageSectionsByRoute(location.pathname, controller.signal)
      .then((result) => setSections(result?.sections ?? []))
      .catch((error: unknown) => {
        // AbortError fires when this effect's own cleanup cancels an
        // in-flight request - normal and expected under React 18
        // StrictMode, which deliberately mounts every effect twice in dev
        // (mount -> cleanup -> mount again), aborting the first fetch. The
        // second, non-aborted invocation already has the real fetch in
        // flight, so this one resolving with nothing isn't a real failure.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSections([]);
      });

    return () => controller.abort();
  }, [location.pathname]);

  return (
    <div id="page">
      <div id="content">
        <main>{sections.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
