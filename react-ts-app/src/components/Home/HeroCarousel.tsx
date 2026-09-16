import { useEffect, useState, type CSSProperties } from 'react';
import type { HeroSlide } from './types';

// Ported from the "#hero-banner" carousel in home.cshtml (lines 372-444).
// No Bootstrap JS is loaded in this app (see Header.tsx's own comment on
// the same point), so the slide advance/indicator behavior is plain React
// state here instead - matches the source's own data-interval="7000".
const AUTO_ADVANCE_MS = 7000;

// heroItem.Value("buttonStyler") is a raw inline CSS string (e.g.
// "background-color:#88bc47") applied directly as `style="..."` in
// home.cshtml - React's `style` prop needs an object, so this parses it
// into one instead of dropping it.
function parseInlineStyle(css: string): CSSProperties {
  return Object.fromEntries(
    css
      .split(';')
      .map((rule) => rule.split(':').map((part) => part.trim()))
      .filter(([prop, value]) => prop && value)
      .map(([prop, value]) => [prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), value]),
  );
}

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
    <div className="top-header">
      <div className="hero-container top_extend">
        <div className="container-fluid top_extend">
          <div className="row no-gutter top_extend">
            <div className="top_extend">
              <div id="hero-banner" className="carousel slide top_extend">
                <ol className="carousel-indicators">
                  {slides.map((_, index) => (
                    <li
                      key={index}
                      className={index === activeIndex ? 'active' : ''}
                      onClick={() => goTo(index)}
                    />
                  ))}
                </ol>

                <div className="carousel-inner top_extend">
                  {slides.map((slide, index) => {
                    const HeadingTag = index === 0 ? 'h1' : 'h2';
                    return (
                      <div
                        className={`top_extend item${index === activeIndex ? ' active' : ''}`}
                        key={index}
                        style={{ backgroundImage: `url(${slide.imageUrl})` }}
                      >
                        <div className="hero-caption">
                          <HeadingTag className="hero-title">
                            <span className="cap-title">{slide.productDescription}</span>
                            <br />
                            {slide.title}
                          </HeadingTag>
                          <p className="hero-description">{slide.titleDescription}</p>
                          <br />
                          {slide.buttonUrl && slide.buttonLabel && (
                            <a
                              className="button primary clearfix"
                              style={slide.buttonStyle ? parseInlineStyle(slide.buttonStyle) : undefined}
                              href={slide.buttonUrl}
                            >
                              {slide.buttonLabel}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
