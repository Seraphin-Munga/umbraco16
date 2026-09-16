import { useEffect, useState } from 'react';
import type { HeroSlide } from './types';

// Ported from the "HERO HEADER" block in PageHome.cshtml (lines 33-96): a
// Bootstrap carousel (data-ride="carousel"). No Bootstrap JS is loaded in
// this app (see Header.tsx's own comment on the same point), so the slide
// advance/prev/next/indicator behavior is plain React state here instead -
// Bootstrap's default data-ride="carousel" interval is 5000ms, matched below.
const AUTO_ADVANCE_MS = 5000;

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const goTo = (index: number) => setActiveIndex((index + slides.length) % slides.length);

  return (
    <div className="carousel slide">
      <ol className="carousel-indicators">
        {slides.map((_, index) => (
          <li
            key={index}
            className={index === activeIndex ? 'active' : ''}
            onClick={() => goTo(index)}
          />
        ))}
      </ol>

      <div className="carousel-inner">
        {slides.map((slide, index) => (
          <div className={`carousel-item${index === activeIndex ? ' active' : ''}`} key={index}>
            <div className="slider-gradient">
              <img className="d-block w-100" src={slide.imageUrl} alt="" width="100%" height="100%" />
            </div>
            <div className="carousel-caption">
              <h1 className="ab-jumbo-title">{slide.title}</h1>
              <h2 className="ab-jumbo-discription">
                {slide.description}
                <span />
              </h2>
              {slide.buttonUrl && slide.buttonLabel && (
                <div className="primary-btn">
                  <a href={slide.buttonUrl}>
                    <button>{slide.buttonLabel}</button>
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <a className="carousel-control-prev" role="button" onClick={() => goTo(activeIndex - 1)}>
        <span className="carousel-control-prev-icon" aria-hidden="true" />
        <span className="sr-only">Previous</span>
      </a>
      <a className="carousel-control-next" role="button" onClick={() => goTo(activeIndex + 1)}>
        <span className="carousel-control-next-icon" aria-hidden="true" />
        <span className="sr-only">Next</span>
      </a>
    </div>
  );
}
