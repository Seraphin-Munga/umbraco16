import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchContent } from '../../api/contentApi';
import type { SearchResultItem } from '../../api/contentApi';

// Humanizes a contentType alias ("productLoanPage" -> "Product Loan Page")
// for a small type label under each result - purely cosmetic, no CMS field
// backs it.
function humanizeContentType(alias: string): string {
  return alias
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// Site search results (/search?q=...) - the Header's own search bar
// navigates here on submit (see Header.tsx). Backed by searchContent in
// contentApi.ts, which uses the Delivery API's own `filter=name:*term*`
// directly - see that function's own comment on why (no custom backend
// search endpoint exists or is needed).
export function SearchResults() {
  const [searchParams] = useSearchParams();
  const term = searchParams.get('q') ?? '';

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    searchContent(term, controller.signal)
      .then((items) => {
        setResults(items);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResults([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, [term]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-[28px] font-semibold text-brand-navy">
        {term ? (
          <>
            Search results for <span className="font-bold">&ldquo;{term}&rdquo;</span>
          </>
        ) : (
          'Search'
        )}
      </h1>

      {!term && <p className="mt-4 text-brand-slate">Enter a search term to find pages on this site.</p>}

      {term && loading && <p className="mt-8 text-brand-slate">Searching&hellip;</p>}

      {term && !loading && results.length === 0 && (
        <p className="mt-8 text-brand-slate">No pages found matching &ldquo;{term}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-8 divide-y divide-brand-line">
          {results.map((result) => (
            <li key={result.id} className="py-5">
              <Link to={result.path} className="block">
                <div className="text-lg font-semibold text-brand-navy hover:underline">{result.name}</div>
                <div className="mt-1 text-sm text-brand-slate">{humanizeContentType(result.contentType)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
