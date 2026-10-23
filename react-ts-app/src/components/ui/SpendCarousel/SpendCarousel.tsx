import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../Button/Button';
import { LazyImage } from '../Image/LazyImage';

export interface SpendSlide {
  imageUrl: string;
  title: string;
  bodyHtml: string;
  cta: { label: string; url: string } | null;
}

export interface SpendCarouselProps {
  heading?: string;
  introHtml?: string;
  slides: SpendSlide[];
  background?: string;
}

// "Spend with our benefit partners" carousel (spendCarouselBlock,
// CMS-driven - see cms/renderPageSection.tsx) - ported from the legacy
// Audacious Rewards page: a partner logo card beside its title, copy and
// button, with dot indicators and previous/next arrows (hidden for a single
// slide).
export function SpendCarousel({ heading, introHtml, slides, background = '' }: SpendCarouselProps) {
  const [active, setActive] = useState(0);
  if (slides.length === 0) return null;
  const slide = slides[Math.min(active, slides.length - 1)];
  const go = (step: number) => setActive((current) => (current + step + slides.length) % slides.length);

  return (
    <section className={`py-12 md:py-20 ${background}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="text-[28px] font-bold text-brand-navy md:text-[40px]">{heading}</h2>}
        {introHtml && (
          <div
            className="mt-4 max-w-2xl text-base leading-relaxed text-brand-navy"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        )}

        <div className="mt-10 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div className="flex aspect-square max-h-[520px] items-center justify-center rounded-[25px] border-4 border-[#dcdcdc] bg-white p-10">
            {slide.imageUrl && (
              <LazyImage className="block max-h-full w-auto object-contain" src={slide.imageUrl} alt={slide.title} />
            )}
          </div>
          <div>
            <h3 className="text-[32px] leading-tight font-bold text-brand-navy md:text-[48px]">{slide.title}</h3>
            <div
              className="mt-8 text-lg text-brand-navy [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: slide.bodyHtml }}
            />
            {slide.cta && (
              <div className="mt-6">
                <Button href={slide.cta.url} target="_blank" rel="noopener">
                  {slide.cta.label}
                </Button>
              </div>
            )}

            {slides.length > 1 && (
              <div className="mt-10 flex items-center justify-between gap-6">
                <div className="flex gap-2">
                  {slides.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Show ${item.title}`}
                      onClick={() => setActive(index)}
                      className={`h-2.5 w-12 rounded-full ${index === active ? 'bg-brand-navy' : 'bg-[#c4c4c4]'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => go(-1)}
                    className="flex size-12 items-center justify-center rounded-full border-2 border-brand-muted text-brand-muted"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => go(1)}
                    className="flex size-12 items-center justify-center rounded-full border-2 border-brand-muted text-brand-muted"
                  >
                    <ArrowRight className="size-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
