import { LazyImage } from '../Image/LazyImage';

export interface ImageBannerProps {
  imageUrl: string;
  mobileImageUrl?: string;
  imageAlt?: string;
  linkUrl?: string;
}

// Full-width artwork banner whose text is part of the image itself
// (imageBannerBlock, CMS-driven - see cms/renderPageSection.tsx) - e.g. the
// Audacious Rewards "Grocery shopping now more rewarding" banner. An
// optional mobile crop swaps in below the sm breakpoint.
export function ImageBanner({ imageUrl, mobileImageUrl, imageAlt = '', linkUrl }: ImageBannerProps) {
  if (!imageUrl) return null;

  const image = (
    <picture>
      {mobileImageUrl && <source media="(max-width: 639px)" srcSet={mobileImageUrl} />}
      <LazyImage className="block h-auto w-full" src={imageUrl} alt={imageAlt} loading="eager" />
    </picture>
  );

  return (
    <section className="w-full px-2 pt-2 sm:px-3">
      {linkUrl ? <a href={linkUrl}>{image}</a> : image}
    </section>
  );
}
