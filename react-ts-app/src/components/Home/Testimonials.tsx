import { useState } from 'react';
import type { TestimonialItem } from './types';

// Ported from the "Testimonial part" block in PageHome.cshtml (lines
// 459-501): another Bootstrap carousel, same plain-React-state approach as
// HeroCarousel (see that file's comment - no Bootstrap JS is loaded here).
interface TestimonialsProps {
  heading: string;
  items: TestimonialItem[];
}

export function Testimonials({ heading, items }: TestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  const goTo = (index: number) => setActiveIndex((index + items.length) % items.length);

  return (
    <div className="container text-center">
      <h1 className="ab-test-title">Testimonials</h1>
      <h2 className="test-header">{heading}</h2>
      <div className="carousel slide ab-test-adjust">
        <div className="carousel-inner">
          {items.map((item, index) => (
            <div className={`carousel-item${index === activeIndex ? ' active' : ''}`} key={index}>
              <div className="row h-100">
                <div className="col col-sm-3 col-sm-offset-4 overlay-img my-auto align-items-center">
                  <img className="overlay-img" src={item.avatarUrl} loading="lazy" width="90%" height="100%" />
                </div>
                <div className="col col-sm-7 test-desc w-100">
                  {item.story}
                  <p className="ab-test-border" />
                  <p className="ab-test-footer">{item.name}</p>
                </div>
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
    </div>
  );
}
