import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "Tap2Glass App" section of the current live home page
// markup. Static content passed as props with defaults so it stays reusable.
const DEFAULT_HEADING = (
  <>
    Get The <br />
    <span className="span-major-title">Tap2Glass</span> App
  </>
);

interface Tap2GlassSectionProps {
  downloadUrl?: string;
  downloadLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  description?: string;
  heading?: ReactNode;
}

export function Tap2GlassSection({
  downloadUrl = 'https://play.google.com/store/apps/details?id=za.co.synthesis.halo.mpos.dashpay',
  downloadLabel = 'Download Now',
  imageUrl = 'https://www.africanbank.co.za/media/zlellrbh/ab-mobility-banking.png',
  imageAlt = 'Teenage girl',
  description = 'Revolutionalise the way you manage your business and get paid. Tap2Glass turns your NFC enabled Android device (phone or tablet) into a card machine for easy customer payments. It’s a quick, cost-effective, convenient, and more importantly, a secure way to transact.',
  heading = DEFAULT_HEADING,
}: Tap2GlassSectionProps) {
  return (
    <section className="section mtb-120 bg-white">
      <div className="container">
        <div className="row md-text-center">
          <div className="col-md-12">
            <h1 className="color-brand-1 major-title">{heading}</h1>
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
          </div>
        </div>

        <div className="row mtb-40 md-text-center">
          <div className="col-md-8">
            <div className="tap-2-glass-image-holder">
              <img className="img-responsive" src={imageUrl} alt={imageAlt} />
            </div>
          </div>
          <div className="col-md-4 mt-20">
            <p className="font-md color-brand-1 mb-15">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
