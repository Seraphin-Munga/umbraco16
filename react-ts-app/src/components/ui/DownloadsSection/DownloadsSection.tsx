export interface DownloadItem {
  description: string;
  fileUrl: string;
  buttonText: string;
}

export interface DownloadsSectionProps {
  heading: string;
  items: DownloadItem[];
}

// "More to read" style downloads list (downloadsSectionBlock, CMS-driven,
// any page - see cms/renderPageSection.tsx).
//
// Was previously `.container`/`.row`/`.col-xl-6`/`.campaign-list`/`.col-
// sm-9`/`.col-sm-3`/etc - most of that grid only had a `width:100%` mobile
// fallback defined anywhere loaded (main.min.css), with no wider
// breakpoint - see PromoSplit.tsx's own comment on why the real Bootstrap
// grid (public/vendor/projectmagic.css/bootstrap.css) isn't loaded, so
// each download row always stacked full-width regardless of viewport.
// Kept that stacked-by-default behavior but added a real sm+ breakpoint
// (75/25 split, matching the source's col-sm-9/col-sm-3 proportions)
// instead of reproducing the broken always-stacked original. `.download-
// btn`'s own hover color (#002b60) is real - defined in main.min.css,
// which is loaded - inlined below as hover:bg-[#002b60] rather than kept
// as a plain className, per this pass's goal of no non-Tailwind classes.
export function DownloadsSection({ heading, items }: DownloadsSectionProps) {
  return (
    <section className="bg-[#F2F2F2] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mt-[15px] mb-[20px] text-brand-ink">{heading}</h1>

        <ul>
          {items.map((item) => (
            <li key={item.description} className="border-b border-[#e5e5e5] py-6 first:border-t">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-base leading-[1.2] text-[#3D565F] sm:w-3/4">{item.description}</div>
                <div className="sm:w-1/4 sm:text-right">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-full bg-brand-lime px-6 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#002b60]"
                  >
                    {item.buttonText}
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
