import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "Tap2Glass App" section of the current live home page
// markup. Content comes from the CMS-managed homePage node (see
// contentApi.ts's fetchHomePageSections) - no hardcoded fallback content,
// so the download button/image only render when the editor has set them.
interface Tap2GlassSectionProps {
  downloadUrl?: string;
  downloadLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  description?: string;
  heading?: ReactNode;
}

export function Tap2GlassSection({
  downloadUrl,
  downloadLabel,
  imageUrl,
  imageAlt,
  description,
  heading,
}: Tap2GlassSectionProps) {
  return (
    <section className="my-10 bg-white md:my-[120px]">
      <div className="mx-auto max-w-7xl px-4 text-center max-[768px]:text-left sm:px-6 lg:px-8">
        <h1 className="text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>
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

        <div className="mt-10 text-center max-[768px]:text-left md:grid md:grid-cols-12 md:gap-8">
          {imageUrl && (
            <div className="md:col-span-8">
              <div className="max-h-[350px] overflow-hidden rounded-[29px]">
                <img className="block w-full object-cover" src={imageUrl} alt={imageAlt} />
              </div>
            </div>
          )}
          <div className="mt-5 md:col-span-4 md:mt-0">
            <p className="mb-[15px] text-base text-brand-ink">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
