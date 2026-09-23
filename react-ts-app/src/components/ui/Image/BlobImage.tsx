import type { ComponentProps } from 'react';
import { cn } from 'cn';

// Shared "organic blob" crop for every CMS-driven photo beside a text
// column (FeatureChecklist, FeatureSplit, HeroSplit, PromoSplit all
// repeated this exact className) - same asymmetric border-radius
// reproducing projectmagic.css's blob mask, factored into one component
// instead of four copies of the same <img>.
export type BlobImageProps = ComponentProps<'img'>;

export function BlobImage({ className, alt = '', ...props }: BlobImageProps) {
  return (
    <img
      className={cn('block h-auto w-full rounded-[71%_29%_66%_34%/41%_42%_58%_59%] object-cover', className)}
      alt={alt}
      {...props}
    />
  );
}
