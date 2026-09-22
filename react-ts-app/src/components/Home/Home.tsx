import type { HomePageSection } from '../../api/contentApi';
import { renderPageSection } from '../../cms/renderPageSection';
import './Home.css';

const IMG = (seed: string, w: number, h: number) => `https://placehold.co/${w}x${h}/png?text=${seed}`;

const MOCK_SECTIONS: HomePageSection[] = [
  {
    kind: 'heroCarouselBlock',
    autoAdvanceSeconds: null,
    slides: [
      {
        imageUrl: IMG('Slide+1', 1200, 800),
        titleMain: 'We give credit',
        titleHighlight: 'where progress is due',
        description: 'Everyday banking, loans and credit built around you.',
        buttonLabel: 'Get started',
        buttonUrl: '#',
      },
      {
        imageUrl: IMG('Slide+2', 1200, 800),
        titleMain: 'Bank with',
        titleHighlight: 'audacity',
        description: 'Products designed for real South African life.',
        buttonLabel: 'Learn more',
        buttonUrl: '#',
      },
    ],
    gridItems: [
      { iconUrl: IMG('icon1', 60, 60), label: 'Personal Loans', url: '#' },
      { iconUrl: IMG('icon2', 60, 60), label: 'MyWORLD Account', url: '#' },
      { iconUrl: IMG('icon3', 60, 60), label: 'Insurance', url: '#' },
      { iconUrl: IMG('icon4', 60, 60), label: 'Investments', url: '#' },
      { iconUrl: IMG('icon5', 60, 60), label: 'Business Loans', url: '#' },
    ],
  },
  {
    kind: 'bankWithAudacityBlock',
    heading: 'Bank with audacity',
    cards: [
      { id: '1', title: 'MyWORLD Account', description: 'A bank account that works as hard as you do.', buttonLabel: 'Apply now', buttonUrl: '#' },
      { id: '2', title: 'Personal Loan', description: 'Get the funds you need, when you need them.', buttonLabel: 'Apply now', buttonUrl: '#' },
      { id: '3', title: 'Credit Card', description: 'Flexible credit that fits your lifestyle.', buttonLabel: 'Apply now', buttonUrl: '#' },
    ],
  },
  {
    kind: 'myWorldAccountBlock',
    heading: 'MyWORLD Account',
    highlightWord: 'Your world,',
    subheading: 'Everything you need in one account',
    ctaLabel: 'Open an account',
    ctaUrl: '#',
    features: ['No monthly fees', 'Free digital banking', 'Instant notifications', 'Cashback rewards', 'Airtime & data', '24/7 support'],
  },
  {
    kind: 'debitCardShowcaseBlock',
    imageUrl: IMG('Debit+Card', 900, 500),
    alt: 'African Bank debit card',
  },
  {
    kind: 'rewardsSectionBlock',
    heading: 'Audacious Rewards',
    subheading: 'Get rewarded for banking with us',
    intro: 'Earn cashback and rewards every time you swipe.',
    cards: [
      { id: '1', imageUrl: IMG('Reward+1', 400, 200), imageAlt: 'Reward', description: 'Up to 5% cashback on groceries.', buttonLabel: 'Find out more', buttonUrl: '#' },
      { id: '2', imageUrl: IMG('Reward+2', 400, 200), imageAlt: 'Reward', description: 'Discounted fuel at partner stations.', buttonLabel: 'Find out more', buttonUrl: '#' },
      { id: '3', imageUrl: IMG('Reward+3', 400, 200), imageAlt: 'Reward', description: 'Exclusive travel deals.', buttonLabel: 'Find out more', buttonUrl: '#' },
    ],
  },
  {
    kind: 'tap2GlassBlock',
    heading: 'Get The Tap2Glass App',
    downloadUrl: '#',
    downloadLabel: 'Download now',
    imageUrl: IMG('Tap2Glass', 900, 500),
    imageAlt: 'Tap2Glass app',
    description: 'Turn your phone into a card machine and accept payments anywhere.',
  },
  {
    kind: 'businessAudacityBlock',
    heading: 'We back your business audacity',
    videoThumbnailUrl: IMG('Video', 500, 400),
    slides: [
      { title: 'Funding', paragraphs: ['We help businesses grow with flexible funding options.', 'Apply online in minutes.'] },
      { title: 'Support', paragraphs: ['Dedicated business bankers to guide you every step.'] },
    ],
    contactCards: [
      { title: '0861 555 555', subtitle: 'Business banking support' },
      { title: 'business@africanbank.co.za', subtitle: 'Email our team' },
    ],
  },
  {
    kind: 'appDownloadBlock',
    heading: 'Download the African Bank App',
    subheading: 'Bank anytime, anywhere',
    description: 'Manage your accounts, make payments, and more - all from your phone.',
    downloadUrl: '#',
    downloadLabel: 'Download now',
    imageUrl: IMG('App', 900, 700),
    imageAlt: 'African Bank App',
  },
  {
    kind: 'testimonialsBlock',
    heading: 'What our customers say',
    videos: [
      { id: '1', videoId: 'dQw4w9WgXcQ', thumbnailUrl: IMG('Video+1', 400, 250) },
      { id: '2', videoId: 'dQw4w9WgXcQ', thumbnailUrl: IMG('Video+2', 400, 250) },
      { id: '3', videoId: 'dQw4w9WgXcQ', thumbnailUrl: IMG('Video+3', 400, 250) },
    ],
  },
];

export function Home() {
  return (
    <div id="page">
      <div id="content">
        <main>{MOCK_SECTIONS.map(renderPageSection)}</main>
      </div>
    </div>
  );
}
