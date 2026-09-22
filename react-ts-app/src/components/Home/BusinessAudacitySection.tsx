import type { ReactNode } from 'react';
import { useState } from 'react';
import { Play } from 'lucide-react';

// Ported from the "We back your business audacity" section of the current
// live home page markup: a text-slider carousel (Bootstrap's own
// data-ride="carousel" / data-slide-to, not functional since no Bootstrap JS
// is loaded here - see Header.tsx's own comment on the same point - so this
// is plain React state instead) plus a video placeholder and two stacked
// contact cards. The video placeholder's data-toggle="modal" /
// data-target="#videoModal" wiring is dropped since no #videoModal markup
// exists anywhere in the ported source; an empty leftover <div></div>
// between the video and card columns is also dropped as clear markup
// filler, not real content. Content comes from the CMS-managed homePage
// node (see contentApi.ts's fetchHomePageSections) - no hardcoded fallback
// content.
export interface BusinessAudacitySlide {
  title: string;
  paragraphs: string[];
}

export interface StackedContactCard {
  title: string;
  subtitle: string;
}

interface BusinessAudacitySectionProps {
  slides: BusinessAudacitySlide[];
  initialIndex?: number;
  videoThumbnailUrl?: string;
  heading?: ReactNode;
  contactCards?: StackedContactCard[];
}

const CARD_BG = ['bg-brand-navy', 'bg-[#5dc300]'];

export function BusinessAudacitySection({
  slides,
  initialIndex = 0,
  videoThumbnailUrl,
  heading,
  contactCards = [],
}: BusinessAudacitySectionProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeSlide = slides[activeIndex];

  return (
    <section className="flex min-h-[800px] items-center bg-[#f2f2f2] py-10">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 text-center max-[768px]:text-left sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <h1 className="mb-5 text-[20px] leading-none font-extralight text-brand-ink sm:text-[65px]">{heading}</h1>

          <div className="mt-10 min-h-[180px]">
            {activeSlide && (
              <>
                <h4 className="mb-5 font-semibold text-[#5dc300]">{activeSlide.title}</h4>
                {activeSlide.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    className={`text-base text-brand-ink ${
                      paragraphIndex < activeSlide.paragraphs.length - 1 ? 'mb-[15px]' : ''
                    }`}
                    key={paragraphIndex}
                  >
                    {paragraph}
                  </p>
                ))}
              </>
            )}
          </div>

          {slides.length > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 max-[768px]:justify-start">
              <div className="flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Show slide ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`size-2.5 rounded-full transition-colors ${
                      index === activeIndex ? 'bg-brand-ink' : 'bg-[#ccc]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-[#666]">
                <span className="text-base text-brand-navy">{activeIndex + 1}</span> / {slides.length}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-5 max-[768px]:mt-[70px] sm:flex-row">
          {videoThumbnailUrl && (
            <div className="w-full sm:w-1/2">
              <div className="relative w-full cursor-pointer overflow-hidden rounded-[29px] bg-brand-ink">
                <img className="block h-auto w-full" src={videoThumbnailUrl} alt="Video Preview" />
                <div className="absolute top-1/2 left-1/2 flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60">
                  <Play className="size-6 fill-white text-white" />
                </div>
              </div>
            </div>
          )}

          <div className="w-full sm:w-1/2">
            {contactCards.map((card, index) => (
              <div
                className={`mb-[15px] flex h-[200px] w-full flex-col items-start justify-center rounded-[29px] p-5 ${CARD_BG[index % 2]}`}
                key={card.title}
              >
                <h4 className="text-2xl font-semibold text-white">{card.title}</h4>
                {card.subtitle && <p className="text-xs text-white">{card.subtitle}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
