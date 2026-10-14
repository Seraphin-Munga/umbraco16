import { useState, type ComponentProps } from 'react';
import { cn } from 'cn';
import { Skeleton } from '../Skeleton';

export type LazyImageProps = ComponentProps<'img'> & {
  wrapperClassName?: string;
};


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
