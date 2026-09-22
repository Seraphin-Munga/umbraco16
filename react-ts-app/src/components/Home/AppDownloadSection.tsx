import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "Download the African Bank App" section of the current
// live home page markup. Content comes from the CMS-managed homePage node
// (see contentApi.ts's fetchHomePageSections) - no hardcoded fallback
// content, so the download button/image only render when the editor has
// set them.
interface AppDownloadSectionProps {
  downloadUrl?: string;
  downloadLabel?: string;
  subheading?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  heading?: ReactNode;
}

export function AppDownloadSection({
  downloadUrl,
  downloadLabel,
  subheading,
  description,
  imageUrl,
  imageAlt,
  heading,
}: AppDownloadSectionProps) {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center max-[768px]:text-left md:flex-row-reverse">
          <div className="md:w-1/2">
            <h1 className="mb-5 text-brand-ink">{heading}</h1>

            {subheading && <h4 className="mb-5 font-semibold text-brand-ink">{subheading}</h4>}
            <p className="text-base text-brand-ink">{description}</p>

            {downloadUrl && downloadLabel && (
              <div className="mt-8 text-left">
                <Button href={downloadUrl}>
                  {downloadLabel}
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth={0}
                    viewBox="0 0 512 512"
                    className="ml-2 size-4 transition-transform duration-500 group-hover:translate-x-1"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={32}
                      d="M320 336h76c55 0 100-21.21 100-75.6s-53-73.47-96-75.6C391.11 99.74 329 48 256 48c-69 0-113.44 45.79-128 91.2-60 5.7-112 35.88-112 98.4S70 336 136 336h56m0 64.1 64 63.9 64-63.9M256 224v224.03"
                    />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="md:w-1/2">
              <img className="block" src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
