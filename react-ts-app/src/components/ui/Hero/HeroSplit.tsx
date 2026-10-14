import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

export interface HeroCta {
  label: string;
  url: string;
}

export interface HeroSplitProps {
  heading: string;
  description?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  imageUrl?: string;
  imageAlt?: string;
  background?: string;
}


export function HeroSplit({
  heading,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  imageAlt = '',
  background = 'bg-brand-mist',
}: HeroSplitProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`mt-0 pb-[40px] sm:pb-[120px] ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${hasImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          <div>
            <h1 className="mb-[20px] text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">
              {heading}
            </h1>
            {description && <p className="text-base leading-[1.3] text-brand-blue">{description}</p>}
            {(primaryCta || secondaryCta) && (
              <div className="mt-[50px] flex flex-wrap items-center gap-[30px]">
                {primaryCta && <Button href={primaryCta.url}>{primaryCta.label}</Button>}
                {secondaryCta && (
                  <Button href={secondaryCta.url} variant="brand-link">
                    {secondaryCta.label}
                  </Button>
                )}
              </div>
            )}
          </div>

          {hasImage && (
            <div className="relative w-full">
              <BlobImage src={imageUrl} alt={imageAlt} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
