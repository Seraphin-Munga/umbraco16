import { useEffect, useState } from 'react';
import { Button } from '../ui/Button/Button';

// Ported from the "#heroSlider" carousel + "#productGrid" static grid in the
// current live home page markup - a single <section class="section-rounded-edge-3">
// block. Content (slides/gridItems) comes from the CMS-managed homePage
// node (see contentApi.ts's fetchHomePageSections) - no hardcoded fallback
// content, so an empty CMS section list here just renders nothing.
export interface HeroCarouselSlide {
  imageUrl: string;
  titleMain: string;
  titleHighlight: string;
  description: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface HeroProductGridItem {
  iconUrl: string;
  label: string;
  url: string;
}

const AUTO_ADVANCE_MS = 7000;

interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  gridItems: HeroProductGridItem[];
  preloadImages?: string[];
  initialIndex?: number;
  autoAdvanceMs?: number;
}

export function HeroCarousel({
  slides,
  gridItems,
  preloadImages = [],
  initialIndex = 0,
  autoAdvanceMs = AUTO_ADVANCE_MS,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, autoAdvanceMs);
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceMs]);

  if (slides.length === 0) return null;

  return (
    <section className="flex w-full items-center pb-[10px] max-[768px]:min-h-[200px] min-[769px]:min-h-[60vh]">
      <div className="mx-[1%] my-[15px] h-[70vh] w-[98%] overflow-hidden rounded-[29px] bg-black">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[29px] max-[768px]:flex-col min-[769px]:flex-row">
          <div className="relative flex-1 max-[768px]:order-[-1] max-[768px]:h-[15vh] min-[769px]:h-full">
            <div className="absolute bottom-[15px] left-[35px] z-3 flex justify-start gap-1.5 max-[768px]:hidden">
              {slides.map((_, index) => (
                <div
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`size-2 cursor-pointer rounded-full transition-[transform,opacity] duration-200 ${
                    index === activeIndex
                      ? 'scale-150 border-2 border-[#b6d133] bg-brand-ink opacity-100'
                      : 'bg-white opacity-60'
                  }`}
                />
              ))}
            </div>

            {slides.map((slide, index) => (
              <div
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${slides.length}`}
                style={{ backgroundImage: `url("${slide.imageUrl}")` }}
                className={`absolute inset-0 h-full w-full bg-cover bg-center rounded-tl-[29px] rounded-bl-[29px] transition-opacity duration-[1200ms] ease-in-out max-[768px]:rounded-none ${
                  index === activeIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-2 h-full w-full rounded-tl-[29px] rounded-bl-[29px] bg-[linear-gradient(270deg,#002a602e_0%,#002a6085_38%,#002a60ba_100%)] max-[768px]:rounded-none"
                />
                <div className="absolute right-5 bottom-[35px] left-5 z-3 max-w-[90%] text-left text-white max-[768px]:right-5 min-[769px]:bottom-20 min-[769px]:left-[30px]">
                  <h1 className="mb-5 text-[20px] leading-none font-extralight sm:text-[65px]">
                    {slide.titleMain} <br />
                    <span className="font-bold">{slide.titleHighlight}</span>
                  </h1>
                  <p className="hidden text-lg sm:block">{slide.description}</p>
                  <div className="mt-[50px] flex items-start">
                    <Button href={slide.buttonUrl} role="button">
                      {slide.buttonLabel}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid w-full grid-cols-2 bg-[#002d66] max-[768px]:order-1 max-[768px]:h-auto max-[768px]:grid-cols-[repeat(auto-fill,minmax(30%,1fr))] max-[768px]:overflow-hidden min-[769px]:h-full min-[769px]:w-[300px]">
            {gridItems.map((item, index) => (
              <a
                href={item.url}
                key={item.label}
                className={`group relative flex cursor-pointer flex-col items-center justify-center border border-white/5 bg-[#003b85] text-center text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-[background-color] duration-200 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(0,0,0,0.05))] hover:bg-[#002d66] max-[768px]:h-[10vh] max-[768px]:px-2.5 max-[768px]:py-10 min-[769px]:aspect-square ${
                  index === gridItems.length - 1 && gridItems.length % 2 === 1 ? 'col-span-2' : ''
                }`}
              >
                <div>
                  <img className="mx-auto h-[35px] max-[768px]:mt-0.5 max-[768px]:h-[30px]" src={item.iconUrl} alt="" />
                  <div className="mt-0 text-white">{item.label}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden">
        {preloadImages.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
      </div>
    </section>
  );
}
