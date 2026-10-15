import { useEffect } from 'react';

// Matches index.html's own static <title> - the fallback for any route
// whose CMS node has no seoTitle set (or hasn't loaded yet).
const DEFAULT_TITLE = 'South African Bank for Consumers - African Bank, Audacity to Believe!';

export interface SeoMetaInput {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

function upsertMetaByAttr(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);

  if (!content) {
    existing?.remove();
    return;
  }

  const tag = existing ?? document.createElement('meta');
  tag.setAttribute(attr, key);
  tag.setAttribute('content', content);
  if (!existing) document.head.appendChild(tag);
}

function upsertCanonical(href: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!href) {
    existing?.remove();
    return;
  }

  const link = existing ?? document.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  if (!existing) document.head.appendChild(link);
}

/**
 * Pushes per-route SEO metadata into the document head - this is a plain
 * Vite CSR SPA with no SSR and no document-head library (no react-helmet),
 * so React Router navigation alone never touches <title>/<meta> past the
 * single static pair baked into index.html. Call this once per page
 * component with whatever seoTitle/seoDescription/canonicalUrl/ogImage/
 * noIndex came back from the CMS (see contentApi.ts's PageSeo/mapPageSeo).
 */
export function useSeoMeta({
  title,
  description = '',
  canonicalUrl = '',
  ogImage = '',
  noIndex = false,
}: SeoMetaInput) {
  useEffect(() => {
    const resolvedTitle = title || DEFAULT_TITLE;

    document.title = resolvedTitle;
    upsertMetaByAttr('name', 'description', description);
    upsertMetaByAttr('property', 'og:title', resolvedTitle);
    upsertMetaByAttr('property', 'og:description', description);
    upsertMetaByAttr('property', 'og:image', ogImage);
    upsertCanonical(canonicalUrl);
    upsertMetaByAttr('name', 'robots', noIndex ? 'noindex, nofollow' : '');

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, canonicalUrl, ogImage, noIndex]);
}
