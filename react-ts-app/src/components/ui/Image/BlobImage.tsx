import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { LazyImage } from './LazyImage';

// Shared crop for every CMS-driven photo beside a text column
// (FeatureChecklist, FeatureSplit, HeroSplit, PromoSplit all repeated this
// exact className) - factored into one component instead of four copies
// of the same <img>.
export type BlobImageProps = ComponentProps<'img'> & { wrapperClassName?: string };

// `wrapperClassName` defaults to the original "h-auto w-full" (every
// existing call site keeps its current behaviour unchanged) - a caller can
// override it with a fixed `aspect-[...]` to reserve the box's height
// up front instead of waiting for the photo to finish loading. Without
// that, LazyImage's wrapper has no height until the <img> inside it
// establishes one, so the surrounding layout visibly jumps/collapses the
// moment a lazy-loaded photo finishes loading (confirmed live on
// BusinessHeroCarousel, which passes a fixed aspect ratio for exactly
// this reason - see that component's own comment).
export function BlobImage({ className, wrapperClassName = 'h-auto w-full', alt = '', ...props }: BlobImageProps) {
  return (
    <LazyImage
      wrapperClassName={wrapperClassName}
      className={cn('block h-auto w-full object-cover', className)}
      alt={alt}
      {...props}
    />
  );
}
