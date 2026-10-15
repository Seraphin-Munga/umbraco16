import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';
import { LazyImage } from '../ui/Image/LazyImage';



interface AppDownloadSectionProps {
  downloadUrl?: string;
  downloadLabel?: string;
  subheading?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  heading?: ReactNode;
  background?: string;
}

export function AppDownloadSection({
  downloadUrl,
  downloadLabel,
  subheading,
  description,
  imageUrl,
  imageAlt,
  heading,
  background = '',
}: AppDownloadSectionProps) {
  return (
    <section className={`py-10 bg-white`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-left md:flex-row">
          <div className="md:w-1/2">
            <h1 className="mb-5 text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">
              {heading}
            </h1>

            {subheading && <h4 className="mb-5 text-xl font-semibold text-brand-ink">{subheading}</h4>}
            <p className="text-base text-brand-ink">{description}</p>

            {downloadUrl && downloadLabel && (
              <div className="mt-8 text-left">
                <Button href={downloadUrl}>{downloadLabel}</Button>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="md:w-1/2">
              <LazyImage className="block" src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
