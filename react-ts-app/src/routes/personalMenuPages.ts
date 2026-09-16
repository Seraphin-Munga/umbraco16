// The 21 links under the header's "PERSONAL" mega-menu (see the
// PERSONAL <li class="header-mega-menu dropdown"> block rendered from
// Header.tsx's fetched menu data) resolve to 20 distinct internal paths -
// "MyWORLD" and "Pockets" both point at /en/home/banking/ (different
// #fragments on the same page) and so do "Credit life" and "Credit life
// claims" at /en/home/product-credit-life/, so each of those pairs shares
// one stub entry here rather than being listed twice. "Open Account"
// (ib.africanbank.co.za) and "Audacious Rewards Store"
// (audaciousrewards.co.za) are external domains, not routes in this app.
//
// These are placeholder stubs (title + description only, as given) until
// each page's real content is ported the same way Home's sections were.
export interface PersonalMenuPage {
  path: string;
  title: string;
  description: string;
}

export const PERSONAL_MENU_PAGES: PersonalMenuPage[] = [
  {
    path: '/en/home/product-personal-loan/',
    title: 'Personal Loan',
    description: 'Get fixed repayments on flexible terms',
  },
  {
    path: '/en/home/product-consolidation-loan/',
    title: 'Consolidation Loan',
    description: 'Consolidate your debt with lower repayments',
  },
  {
    path: '/en/home/product-12-loan/',
    title: 'The 12% Loan',
    description: 'From R2 000 to R50 000, over 9 to 24 months',
  },
  {
    path: '/en/home/product-credit-card/',
    title: 'Black credit card',
    description: 'Get the Credit Card that suits your lifestyle',
  },
  {
    path: '/en/home/tech-deals/',
    title: 'Tech Deals',
    description: 'Get access to laptops and cellphones from an interest rate of only 12%',
  },
  {
    path: '/en/home/credit-report/',
    title: 'Credit Report',
    description: 'Get your free report',
  },
  {
    // Also serves "Pockets" (same page, #PowerPocket fragment).
    path: '/en/home/banking/',
    title: 'MyWORLD',
    description: 'Revolutionary Bank account designed to meet your day-to-day needs',
  },
  {
    path: '/en/home/product-overdraft/',
    title: 'Overdraft',
    description: 'Apply for Ovedraft',
  },
  {
    path: '/en/home/online-banking/',
    title: 'Online Banking',
    description: 'Manage your account online',
  },
  {
    path: '/en/home/payshap/',
    title: 'PayShap',
    description: 'Use PayShap to make instant payments.',
  },
  {
    path: '/en/home/product-fixed-deposit-investment/',
    title: 'Fixed deposits',
    description: 'Make a single deposit for 3 to 60 months',
  },
  {
    path: '/en/home/product-notice-deposit/',
    title: 'Notice deposits',
    description: 'Access your money with 7, 32 or 90 days’ notice',
  },
  {
    path: '/en/home/product-access-accumulator/',
    title: 'Access accumulator',
    description: 'Earn increasing interest with anytime access',
  },
  {
    path: '/en/home/product-tax-free/',
    title: 'Tax free investment',
    description: 'Invest for 12 months or more, without paying tax',
  },
  {
    path: '/en/home/stokvel/',
    title: 'Stokvel',
    description:
      'A savings account that allows a group of people to save together to achieve shared goals and dreams.',
  },
  {
    // Also serves "Credit life claims" (same page).
    path: '/en/home/product-credit-life/',
    title: 'Credit life',
    description: 'Cover your loan or credit card debt',
  },
  {
    path: '/en/home/product-funeral-cover/',
    title: 'Funeral plan',
    description: 'Cover yourself and your loved ones',
  },
  {
    path: '/en/home/isiko/',
    title: 'Isiko',
    description: 'A solution that seamlessly combines modern financial tools with your traditional needs',
  },
  {
    path: '/en/home/loan-restructure/',
    title: 'loan restructure',
    description: 'We can help you take control of your debt and manage your finances better',
  },
  {
    path: '/en/home/audacious-rewards/',
    title: 'Audacious Rewards',
    description: 'Get rewarded for everyday banking',
  },
];
