import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { LazyImage } from './LazyImage';

// Shared crop for every CMS-driven photo beside a text column
// (FeatureChecklist, FeatureSplit, HeroSplit, PromoSplit all repeated this
// exact className) - factored into one component instead of four copies
// of the same <img>.
export type BlobImageProps = ComponentProps<'img'>;

export function BlobImage({ className, alt = '', ...props }: BlobImageProps) {
  return (
    <LazyImage
      wrapperClassName="h-auto w-full"
      className={cn('block h-auto w-full object-cover', className)}
      alt={alt}
      {...props}
    />
  );
}
