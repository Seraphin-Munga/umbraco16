import { useState } from 'react';
import type { TestimonialItem } from './types';

// Ported from the "#testimonials" carousel in home.cshtml (lines 678-722) -
// no heading text is rendered here (unlike Platform.Umbraco16/
// PageHome.cshtml's not-yet-live redesign, which adds an "Testimonials"
// title + testimonialHeading subtitle). No Bootstrap JS is loaded here (see
// Header.tsx's own comment), so this is plain React state.
interface TestimonialsProps {
  items: TestimonialItem[];
}

export function Testimonials({ items }: TestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  const goTo = (index: number) => setActiveIndex((index + items.length) % items.length);

  return (
    <div className="testimonials-container">
      <div className="container">
        <div className="testimonials-carousel">
          <div id="testimonials" className="carousel slide">
            <ol className="carousel-indicators">
              {items.map((_, index) => (
                <li
                  key={index}
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => goTo(index)}
                />
              ))}
            </ol>

            <div className="carousel-inner">
              {items.map((item, index) => (
                <div className={`item${index === activeIndex ? ' active' : ''}`} key={index}>
                  <div className="testimonial">
                    <div className="avatar">
                      <img src={item.avatarUrl} alt="" />
                    </div>
                    <div className="descr">{item.story}</div>
                    <div className="name">{item.name}</div>
                  </div>
                </div>
              ))}
            </div>

            <a className="left carousel-control" role="button" onClick={() => goTo(activeIndex - 1)}>
              <span className="icon-arrow-left" />
            </a>
            <a className="right carousel-control" role="button" onClick={() => goTo(activeIndex + 1)}>
              <span className="icon-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
