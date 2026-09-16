import { Button } from '../ui/Button/Button';

// Ported from the "Download the African Bank App" section of the current
// live home page markup. Static content passed as props with defaults so it
// stays reusable.
interface AppDownloadSectionProps {
  downloadUrl?: string;
  downloadLabel?: string;
  subheading?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export function AppDownloadSection({
  downloadUrl = 'https://play.google.com/store/apps/details?id=za.co.android.africanbank',
  downloadLabel = 'Download Now',
  subheading = 'Your banking made easier',
  description = 'It’s like having your own bank in your pocket. Access your accounts 24/7, wherever you are. It’s secure and super convenient.',
  imageUrl = 'https://www.africanbank.co.za/media/ubkllrvb/mockup-device3.png',
  imageAlt = 'iori',
}: AppDownloadSectionProps) {
  return (
    <section className="mtb-120">
      <div className="container">
        <div className="row d-flex row-change md-text-center">
          <div className="col-xl-6 col-lg-6 col-md-6">
            <h1 className="color-brand-1 major-title mb-20">
              <span className="span-major-title">Download the </span>
              African Bank App
            </h1>

            <h4 className="color-brand-1 mb-20">{subheading}</h4>
            <p className="font-md color-brand-1">{description}</p>

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

          <div className="col-xl-6 col-lg-6 col-md-6">
            <img className="d-block" src={imageUrl} alt={imageAlt} />
          </div>
        </div>
      </div>
    </section>
  );
}
