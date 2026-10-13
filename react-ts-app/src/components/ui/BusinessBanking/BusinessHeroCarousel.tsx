import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';
import type { HeroCarouselSlide } from '../../Home/HeroCarousel';

const AUTO_ADVANCE_MS = 6000;

export interface BusinessHeroCarouselProps {
  slides: HeroCarouselSlide[];
  autoAdvanceMs?: number;
  backLink?: { label: string; url: string } | null;
}

// The Business Banking page's own top carousel (businessHeroCarouselBlock,
// CMS-driven - see cms/renderPageSection.tsx) - a plain navy band with a
// dot-indicator carousel, heading/description/button beside a blob-cropped
// photo (BlobImage - same organic crop every other CMS photo-beside-text
// section uses, e.g. HeroSplit/PromoSplit), and a thin green accent strip
// along the bottom edge (the live page's own `.bottom-section`). Kept as
// its own component (rather than reusing Home's HeroCarousel for the same
// CMS slide shape) because the live page's own carousel is visually a
// different, simpler style - solid navy background, no rounded corners, no
// side product-grid - not Home's rounded dual-pane carousel look.
export function BusinessHeroCarousel({ slides, autoAdvanceMs = AUTO_ADVANCE_MS, backLink }: BusinessHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, autoAdvanceMs);
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceMs]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex];

  // Based on the whole slide set, not just the active slide - if even one
  // slide has a photo, every slide reserves the same image column (blank
  // on slides without one) so the grid never flips between a 1-column and
  // a 2-column layout as the carousel auto-advances. That column-count
  // flip (on top of BlobImage's own load-time jump - see its comment) was
  // the other half of the page visibly jumping on every slide change.
  const anySlideHasImage = slides.some((s) => Boolean(s.imageUrl));

  return (
    <>
      {backLink && (
        <div className="mt-5 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <a href={backLink.url} className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy">
              <ChevronLeft className="size-4" />
              {backLink.label}
            </a>
          </div>
        </div>
      )}

      <section className={`bg-brand-navy text-white ${backLink ? '' : 'mt-5'}`}>
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${anySlideHasImage ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          <div>
            <h1 className="text-[32px] leading-[1.15] font-medium sm:text-[46px] sm:leading-[1.15]">
              {slide.titleMain}
              {slide.titleHighlight && <span className="font-bold"> {slide.titleHighlight}</span>}
            </h1>
            {slide.description && (
              <p className="mt-6 max-w-[520px] text-base leading-[22px] whitespace-pre-line">
                {slide.description}
              </p>
            )}
            {slide.buttonUrl !== '#' && (
              <div className="mt-8">
                <Button href={slide.buttonUrl}>{slide.buttonLabel}</Button>
              </div>
            )}
          </div>

          {anySlideHasImage && (
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-[420px]">
                {/* object-contain (not BlobImage's own default object-
                    cover) - these are product photos (a debit card, a
                    phone mockup), not organic blob-cropped portraits, so
                    they must stay fully visible rather than cropped to
                    fill the box - cropping a card photo here cut off its
                    edges (confirmed live). A fixed 4:3 aspect ratio still
                    reserves the full height immediately so nothing jumps
                    once a lazy-loaded photo finishes loading or when
                    switching to a slide with a differently-sized source
                    photo - see BlobImage's own comment on
                    wrapperClassName. Rendered (empty) even on a slide with
                    no photo of its own, so this column's space stays
                    reserved instead of the grid collapsing to one column
                    and back as the carousel advances. */}
                {slide.imageUrl && (
                  <BlobImage
                    src={slide.imageUrl}
                    alt=""
                    wrapperClassName="aspect-[4/3] w-full overflow-hidden"
                    className="h-full object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {slides.length > 1 && (
          <div className="mt-10 flex justify-start gap-2 sm:mt-16">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show slide ${index + 1} of ${slides.length}`}
                onClick={() => setActiveIndex(index)}
                className={`size-2.5 rounded-full border border-white transition-colors ${
                  index === activeIndex ? 'bg-white' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        )}
      </div>

        <div className="h-[5px] bg-brand-green" />
      </section>
    </>
  );
}
