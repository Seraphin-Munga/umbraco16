import type { ReactNode } from 'react';
import { useState } from 'react';

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

export function BusinessAudacitySection({
  slides,
  initialIndex = 0,
  videoThumbnailUrl,
  heading,
  contactCards = [],
}: BusinessAudacitySectionProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  return (
    <section className="section-800 bg-grey-60 section-container">
      <div className="container">
        <div className="row md-text-center">
          <div className="col-md-6 col-sm-12 col-xs-12">
            <h1 className="color-brand-1 major-title mb-20">{heading}</h1>

            <div className="container text-slider-carousel">
              <div className="slide-number" id="slideNumber">
                <span className="current-slide">{activeIndex + 1}</span>
                <span className="divider"> / </span>
                <span className="total-slides">{slides.length}</span>
              </div>

              <div id="testimonialCarousel" className="carousel slide">
                <ol className="carousel-indicators">
                  {slides.map((_, index) => (
                    <li
                      key={index}
                      className={index === activeIndex ? 'active' : ''}
                      onClick={() => setActiveIndex(index)}
                    />
                  ))}
                </ol>

                <div className="carousel-inner carousel-inner-height" role="listbox">
                  {slides.map((slide, index) => (
                    <div className={`item${index === activeIndex ? ' active' : ''}`} key={index}>
                      <h4 className="color-brand-2 mb-20">{slide.title}</h4>
                      {slide.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          className={`font-md color-brand-1${
                            paragraphIndex < slide.paragraphs.length - 1 ? ' mb-15' : ''
                          }`}
                          key={paragraphIndex}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-sm-12 col-xs-12">
            <div className="row video-section">
              {videoThumbnailUrl && (
                <div className="col-md-6 col-sm-12 col-xs-12 mb-20">
                  <div className="video-placeholder">
                    <img src={videoThumbnailUrl} alt="Video Preview" />
                    <div className="play-btn" />
                  </div>
                </div>
              )}

              <div className="col-md-6 col-sm-12 col-xs-12">
                {contactCards.map((card, index) => (
                  <div className={`card-stack card-stack-bg-${(index % 2) + 1}`} key={card.title}>
                    <div className="centered-text">
                      <h4 className="text-white">{card.title}</h4>
                      {card.subtitle && <p className="font-xs text-white">{card.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
