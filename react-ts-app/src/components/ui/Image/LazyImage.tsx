import { useState, type ComponentProps } from 'react';
import { cn } from 'cn';
import { Skeleton } from '../Skeleton';

export type LazyImageProps = ComponentProps<'img'> & {
  wrapperClassName?: string;
};

// Native lazy-loading (loading="lazy") plus a pulsing skeleton shown until
// the image has actually finished loading, so CMS-driven photos below the
// fold don't pop in against a blank gap once they scroll into view. Every
// sizing/visual className passed in still lands on the <img> itself
// unchanged - this only wraps it and fades it in over the skeleton.
export function LazyImage({
  className,
  wrapperClassName,
  alt = '',
  loading = 'lazy',
  onLoad,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={cn('relative block', wrapperClassName)}>
      {!loaded && <Skeleton aria-hidden="true" className="absolute inset-0 rounded-[inherit]" />}
      <img
        className={cn('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)}
        alt={alt}
        loading={loading}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        {...props}
      />
    </span>
  );
}
