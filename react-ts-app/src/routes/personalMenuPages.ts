// The 21 links under the header's "PERSONAL" mega-menu (see the
// PERSONAL <li class="header-mega-menu dropdown"> block rendered from
// Header.tsx) resolve to 20 distinct internal paths - "MyWORLD" and
// "Pockets" both point at /en/home/banking/ (different #fragments on the
// same page) and so do "Credit life" and "Credit life claims" at
// /en/home/product-credit-life/, so each of those pairs shares one stub
// entry here rather than being listed twice. "Open Account"
// (ib.africanbank.co.za) and "Audacious Rewards Store"
// (audaciousrewards.co.za) are external domains - see
// PERSONAL_MENU_EXTERNAL_LINKS below instead of this list.
//
// These are placeholder stubs (title + description only, as given) until
// each page's real content is ported the same way Home's sections were.
// `category` mirrors the mega-menu's own column headings (BORROW, BANKING,
// etc.) so Header.tsx can group these back into the same layout.
export type PersonalMenuCategory = 'BORROW' | 'BANKING' | 'INVESTMENTS' | 'INSURE' | 'LIFESTYLE' | 'REWARDS';

export interface PersonalMenuPage {
  category: PersonalMenuCategory;
  path: string;
  title: string;
  description: string;
}

export const PERSONAL_MENU_PAGES: PersonalMenuPage[] = [
  {
    category: 'BORROW',
    path: '/en/home/product-personal-loan/',
    title: 'Personal Loan',
    description: 'Get fixed repayments on flexible terms',
  },
  {
    category: 'BORROW',
    path: '/en/home/product-consolidation-loan/',
    title: 'Consolidation Loan',
    description: 'Consolidate your debt with lower repayments',
  },
  {
    category: 'BORROW',
    path: '/en/home/product-12-loan/',
    title: 'The 12% Loan',
    description: 'From R2 000 to R50 000, over 9 to 24 months',
  },
  {
    category: 'BORROW',
    path: '/en/home/product-credit-card/',
    title: 'Black credit card',
    description: 'Get the Credit Card that suits your lifestyle',
  },
  {
    category: 'BORROW',
    path: '/en/home/tech-deals/',
    title: 'Tech Deals',
    description: 'Get access to laptops and cellphones from an interest rate of only 12%',
  },
  {
    category: 'BORROW',
    path: '/en/home/credit-report/',
    title: 'Credit Report',
    description: 'Get your free report',
  },
  {
    category: 'BANKING',
    // Also serves "Pockets" (same page, #PowerPocket fragment).
    path: '/en/home/banking/',
    title: 'MyWORLD',
    description: 'Revolutionary Bank account designed to meet your day-to-day needs',
  },
  {
    category: 'BANKING',
    path: '/en/home/product-overdraft/',
    title: 'Overdraft',
    description: 'Apply for Ovedraft',
  },
  {
    category: 'BANKING',
    path: '/en/home/online-banking/',
    title: 'Online Banking',
    description: 'Manage your account online',
  },
  {
    category: 'BANKING',
    path: '/en/home/payshap/',
    title: 'PayShap',
    description: 'Use PayShap to make instant payments.',
  },
  {
    category: 'INVESTMENTS',
    path: '/en/home/product-fixed-deposit-investment/',
    title: 'Fixed deposits',
    description: 'Make a single deposit for 3 to 60 months',
  },
  {
    category: 'INVESTMENTS',
    path: '/en/home/product-notice-deposit/',
    title: 'Notice deposits',
    description: 'Access your money with 7, 32 or 90 days’ notice',
  },
  {
    category: 'INVESTMENTS',
    path: '/en/home/product-access-accumulator/',
    title: 'Access accumulator',
    description: 'Earn increasing interest with anytime access',
  },
  {
    category: 'INVESTMENTS',
    path: '/en/home/product-tax-free/',
    title: 'Tax free investment',
    description: 'Invest for 12 months or more, without paying tax',
  },
  {
    category: 'INVESTMENTS',
    path: '/en/home/stokvel/',
    title: 'Stokvel',
    description:
      'A savings account that allows a group of people to save together to achieve shared goals and dreams.',
  },
  {
    category: 'INSURE',
    // Also serves "Credit life claims" (same page).
    path: '/en/home/product-credit-life/',
    title: 'Credit life',
    description: 'Cover your loan or credit card debt',
  },
  {
    category: 'INSURE',
    path: '/en/home/product-funeral-cover/',
    title: 'Funeral plan',
    description: 'Cover yourself and your loved ones',
  },
  {
    category: 'LIFESTYLE',
    path: '/en/home/isiko/',
    title: 'Isiko',
    description: 'A solution that seamlessly combines modern financial tools with your traditional needs',
  },
  {
    category: 'LIFESTYLE',
    path: '/en/home/loan-restructure/',
    title: 'loan restructure',
    description: 'We can help you take control of your debt and manage your finances better',
  },
  {
    category: 'REWARDS',
    path: '/en/home/audacious-rewards/',
    title: 'Audacious Rewards',
    description: 'Get rewarded for everyday banking',
  },
];

// The 2 mega-menu items that point off-site rather than at an internal
// route - kept separate from PERSONAL_MENU_PAGES since they have no page in
// this app, but rendered in the same mega-menu columns for a faithful port.
export interface PersonalMenuExternalLink {
  category: PersonalMenuCategory;
  url: string;
  title: string;
  description: string;
}

export const PERSONAL_MENU_EXTERNAL_LINKS: PersonalMenuExternalLink[] = [
  {
    category: 'BANKING',
    url: 'https://ib.africanbank.co.za/',
    title: 'Open Account',
    description: 'Open a MyWORLD Account',
  },
  {
    category: 'REWARDS',
    url: 'https://www.audaciousrewards.co.za/home',
    title: 'Audacious Rewards Store',
    description: 'Use your rewards and explore our wide range of amazing offers and discounts from our partners',
  },
];

export const PERSONAL_MENU_CATEGORY_ORDER: PersonalMenuCategory[] = [
  'BORROW',
  'BANKING',
  'INVESTMENTS',
  'INSURE',
  'LIFESTYLE',
  'REWARDS',
];
