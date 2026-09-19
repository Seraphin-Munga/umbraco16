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
    <section className="section pb-40 pt-40">
      <div className="container">
        <div className="row align-items-center row-change d-flex flex-row-reverse md-text-center">
          <div className="col-xl-6 col-lg-6 col-md-6">
            <h1 className="color-brand-1 mb-20">{heading}</h1>

            {subheading && <h4 className="color-brand-1 mb-20">{subheading}</h4>}
            <p className="font-md color-brand-1">{description}</p>

            {downloadUrl && downloadLabel && (
              <div className="mt-50 text-start">
                <Button href={downloadUrl}>
                  {downloadLabel}{' '}
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth={0}
                    viewBox="0 0 512 512"
                    className="right-icon"
                    height="1em"
                    width="1em"
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
            <div className="col-xl-6 col-lg-6 col-md-6">
              <img className="d-block" src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
