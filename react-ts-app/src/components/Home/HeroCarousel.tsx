import { useEffect, useState } from 'react';

// Ported from the "#heroSlider" carousel + "#productGrid" static grid in the
// current live home page markup - a single <section class="section-rounded-edge-3">
// block, not the old API-driven "#hero-banner" carousel this file used to
// render. Content is hardcoded here (matches the source exactly) rather than
// fetched, but still passed as props with defaults so it stays reusable.
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

// The live site serves its media library off this origin - relative
// "/media/..." paths only resolve correctly there, not on this app's own host.
const BASE_URL = 'https://www.africanbank.co.za';

const DEFAULT_SLIDES: HeroCarouselSlide[] = [
  {
    imageUrl: `${BASE_URL}/media/1hej1uzu/dig2510_025_credit-camp_2400x800_carousel_banner-home.jpg`,
    titleMain: 'We give Credit',
    titleHighlight: 'where progress is due',
    description: 'Apply for a Personal Loan of up to R500 000',
    buttonLabel: 'Apply Now',
    buttonUrl: '/en/home/credit-campaign/',
  },
  {
    imageUrl: `${BASE_URL}/media/1zqhrrai/ab-banking-online.png`,
    titleMain: 'Ready to',
    titleHighlight: 'reach Your Goals?',
    description: 'Back your audacity with a Personal Loan that works for you',
    buttonLabel: 'Apply now',
    buttonUrl: '/en/home/product-personal-loan/',
  },
  {
    imageUrl: `${BASE_URL}/media/2rup4o2i/bannerhome.png`,
    titleMain: 'Need R20 000',
    titleHighlight: 'to R5 million?',
    description: 'Qualify for a Business Loan if you make R1 million+ in turnover per year. ',
    buttonLabel: 'Explore',
    buttonUrl: '/en/home/business-and-commercial-banking/',
  },
  {
    imageUrl: `${BASE_URL}/media/camlj2rn/ab-business-banking.png`,
    titleMain: 'One of a kind',
    titleHighlight: 'Just like you',
    description: 'The only bank account made to share, with low fees and incredible value',
    buttonLabel: 'Apply now',
    buttonUrl: '/en/home/banking/',
  },
  {
    imageUrl: `${BASE_URL}/media/epojr4lh/ab-consumer-banking.png`,
    titleMain: 'Your future',
    titleHighlight: 'Starts now',
    description: 'Create your tomorrow with competitive interest rates',
    buttonLabel: 'Apply now',
    buttonUrl: '/en/home/product-fixed-deposit-investment/',
  },
  {
    imageUrl: `${BASE_URL}/media/ft2h1n54/ab-fashionable-banking.png`,
    titleMain: 'Backing you,',
    titleHighlight: 'wherever you are',
    description: 'Enjoy peace of mind with an African Bank Credit Card',
    buttonLabel: 'Apply Now',
    buttonUrl: '/en/home/product-credit-card/',
  },
  {
    imageUrl: `${BASE_URL}/media/d2mlnyiz/dig2603_003_stokvel_carouselhome.jpg`,
    titleMain: 'African Bank',
    titleHighlight: 'Stokvel Account',
    description: 'Strength in saving together.',
    buttonLabel: 'Apply Now',
    buttonUrl: '/en/home/stokvel/',
  },
];

const DEFAULT_GRID_ITEMS: HeroProductGridItem[] = [
  {
    iconUrl: `${BASE_URL}/media/xpxhzci0/lib2501_bank-w.png`,
    label: 'BANK',
    url: 'https://www.africanbank.co.za/en/home/banking/#MyWorld',
  },
  {
    iconUrl: `${BASE_URL}/media/o0kiaxk3/lib2501_borrow.png`,
    label: 'BORROW',
    url: 'https://www.africanbank.co.za/en/home/product-personal-loan/#',
  },
  {
    iconUrl: `${BASE_URL}/media/3kdpznd3/lib2501_investments-w.png`,
    label: 'SAVE & INVEST',
    url: 'https://www.africanbank.co.za/en/home/product-fixed-deposit-investment/',
  },
  {
    iconUrl: `${BASE_URL}/media/q30fidjy/lib2501_insurance-w.png`,
    label: 'INSURE',
    url: 'https://africanbank.co.za/en/home/product-funeral-cover/',
  },
  {
    iconUrl: `${BASE_URL}/media/ptje51oz/lib2501_rewards-w.png`,
    label: 'REWARDS',
    url: 'https://www.africanbank.co.za/en/home/audacious-rewards/',
  },
  {
    iconUrl: `${BASE_URL}/media/xmnnxd2m/lifestyle.png`,
    label: 'LIFESTYLE',
    url: 'https://www.africanbank.co.za/en/home/Isiko',
  },
];

const DEFAULT_PRELOAD_IMAGES = [
  `${BASE_URL}/media/vzujjdpw/woman-sitting-with-notebook-laptop.jpg`,
  `${BASE_URL}/media/rp4jz4eb/black-business-director-resting-her-high-end-ceo-chair-after-project.jpg`,
  `${BASE_URL}/media/rf4keoe4/african-business-male-people-shaking-hands.jpg`,
];

interface HeroCarouselProps {
  slides?: HeroCarouselSlide[];
  gridItems?: HeroProductGridItem[];
  preloadImages?: string[];
  initialIndex?: number;
}

export function HeroCarousel({
  slides = DEFAULT_SLIDES,
  gridItems = DEFAULT_GRID_ITEMS,
  preloadImages = DEFAULT_PRELOAD_IMAGES,
  initialIndex = 2,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

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
                      <a href={slide.buttonUrl} className="btn btn-brand-1 hover-up" role="button">
                        {slide.buttonLabel}
                      </a>
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
