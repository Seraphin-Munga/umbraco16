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
// filler, not real content.
export interface BusinessAudacitySlide {
  title: string;
  paragraphs: string[];
}

const DEFAULT_SLIDES: BusinessAudacitySlide[] = [
  {
    title: 'Business & Commercial',
    paragraphs: [
      'From working capital to structured lending, our team of seasoned experts will tailor lending solutions to suite your needs as an entrepreneur, so you can thrive and succeed.',
    ],
  },
  {
    title: 'Corporate Finance and M&A Advisory Services',
    paragraphs: [
      'Our Corporate Finance and M&A team is the sub-Saharan African member firm of Oaklins, the leading global mid-market M&A advisor.',
      'We combine firm roots in the local market and collaboration on a global scale with a passion for excellence.',
    ],
  },
  {
    title: 'Specialised property finance',
    paragraphs: [
      'Our specialised property finance division focuses on tailored financial solutions for both development and investment opportunities.',
      'We focus on traditional commercial and industrial property funding.',
    ],
  },
  {
    title: 'Coverage, Corporate & investment banking',
    paragraphs: [
      'African Bank Business Banking offers products and services designed to assist you in building value, managing business growth, and maximising your company’s potential. We consider tailor-making a solution.',
    ],
  },
];

interface BusinessAudacitySectionProps {
  slides?: BusinessAudacitySlide[];
  initialIndex?: number;
  videoThumbnailUrl?: string;
  contactEmail?: string;
}

export function BusinessAudacitySection({
  slides = DEFAULT_SLIDES,
  initialIndex = 3,
  videoThumbnailUrl = 'https://www.africanbank.co.za/media/jivdojkv/placeholder-thumbnails2.png',
  contactEmail = 'business@africanbank.co.za',
}: BusinessAudacitySectionProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  return (
    <section className="section-800 bg-grey-60 section-container">
      <div className="container">
        <div className="row md-text-center">
          <div className="col-md-6 col-sm-12 col-xs-12">
            <h1 className="color-brand-1 major-title mb-20">
              <span className="span-major-title">We back your </span>business audacity
            </h1>

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
              <div className="col-md-6 col-sm-12 col-xs-12 mb-20">
                <div className="video-placeholder">
                  <img src={videoThumbnailUrl} alt="Video Preview" />
                  <div className="play-btn" />
                </div>
              </div>

              <div className="col-md-6 col-sm-12 col-xs-12">
                <div className="card-stack card-stack-bg-1">
                  <div className="centered-text">
                    <h4 className="text-white">Corporate Finance</h4>
                  </div>
                </div>
                <div className="card-stack card-stack-bg-2">
                  <div className="centered-text">
                    <h4 className="text-white">Contact Us</h4>
                    <p className="font-xs text-white">{contactEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
