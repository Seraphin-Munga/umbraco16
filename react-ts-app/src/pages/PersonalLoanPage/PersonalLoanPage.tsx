import { useEffect, useState } from 'react';
import './PersonalLoanPage.css';
import { fetchProductLoanPageSections } from '../../api/contentApi';
import type { ProductLoanPageSection } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';

// Ported from the fully-static JSX this page used to render directly (see
// git history) into the CMS-managed `productLoanPage` node (Program.cs's
// create-product-loan-schema, fetched via contentApi.ts's
// fetchProductLoanPageSections). Sections render in editor-defined order;
// nothing renders until that node has sections - same "CMS is the only
// source of content" convention Home.tsx already follows. Rendering goes
// through the shared block registry (src/cms/renderPageSection.tsx) - the
// same one DynamicPage.tsx uses for any other CMS page - kept as its own
// component only because this route is already statically registered in
// personalMenuPageComponents.tsx, not because its rendering differs.
export function PersonalLoanPage() {
  const [sections, setSections] = useState<ProductLoanPageSection[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductLoanPageSections(controller.signal)
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
