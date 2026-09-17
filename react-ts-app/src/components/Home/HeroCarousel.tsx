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
    <section className="section-rounded-edge-3">
      <div className="card-wrapper">
        <div className="card-content">
          <div id="heroSlider" className="carousel jumbotron-slider carousel-fade slide">
            <div className="carousel-tracker" id="carouselTracker">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`tracker-button${index === activeIndex ? ' active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>

            {slides.map((slide, index) => (
              <div
                key={index}
                className={`jumbotron-slide${index === activeIndex ? ' active' : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${slides.length}`}
                style={{ backgroundImage: `url("${slide.imageUrl}")` }}
              >
                <div className="carousel-overlay" aria-hidden="true" />
                <div className="carousel-caption-left">
                  <h1 className="text-white major-title mb-20">
                    {slide.titleMain} <br />
                    <span className="span-major-title">{slide.titleHighlight}</span>
                  </h1>
                  <p className="hidden-xs font-lg text-white">{slide.description}</p>
                  <div className="combo-btn mt-50 text-start column1">
                    <p className="combo-btn-text primary">
                      <Button href={slide.buttonUrl} role="button">
                        {slide.buttonLabel}
                      </Button>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div id="productGrid" className="static-grid">
            {gridItems.map((item) => (
              <a href={item.url} className="grid-card" key={item.label}>
                <div>
                  <img className="prod-icon" src={item.iconUrl} alt="" />
                  <div className="prod-title">{item.label}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        {preloadImages.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
      </div>
    </section>
  );
}
