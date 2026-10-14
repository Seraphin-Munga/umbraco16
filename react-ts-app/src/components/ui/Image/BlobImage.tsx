import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { LazyImage } from './LazyImage';


export type BlobImageProps = ComponentProps<'img'> & { wrapperClassName?: string };


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
