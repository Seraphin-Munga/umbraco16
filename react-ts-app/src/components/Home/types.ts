// Shapes for the homepage content, ported from Platform/Web/Views/home.cshtml
// (the live site's actual template - Layout = "Master.cshtml" - not the
// in-progress Platform.Umbraco16/PageHome.cshtml redesign, which has a
// different, not-yet-live section layout).

export interface HeroSlide {
  imageUrl: string;
  title: string;
  // The "cap-title" span shown above the title (heroProductDescription).
  productDescription: string;
  // heroTitleDescription - the paragraph under the title. Not present on
  // Platform.Umbraco16's HeroStructure model, only this live one.
  titleDescription: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  // heroItem.Value("buttonStyler") is applied as a raw inline `style`
  // attribute in the source - kept as an opaque string rather than parsed.
  buttonStyle: string | null;
}

export interface ShoulderCard {
  iconUrl: string;
  title: string;
  description: string;
  linkUrl: string | null;
}

export interface ShoulderTab {
  tabId: string;
  tabName: string;
  tabHeading: string;
  tabIconUrl: string;
  tabIconAlt: string;
  cards: ShoulderCard[];
}

// The "whatsNew" content item (ebankItitem2) - when present, it takes over
// the *first* slide of the bank-story carousel, splitting it with that
// slide's own blog post instead of the blog post filling the whole slide.
export interface WhatsNew {
  title: string;
  contentMarkup: string;
  linkUrl: string;
  linkLabel: string;
}

export interface HelpLink {
  text: string;
  buttonText: string;
  url: string;
}

export interface HelpTab {
  tabId: string;
  tabName: string;
  tabIconUrl: string;
  tabIconAlt: string;
  links: HelpLink[];
}

export interface TestimonialItem {
  avatarUrl: string;
  // testimonialStory is a plain string property (not rich text) per the
  // generated Umbraco model, so it renders as escaped text.
  story: string;
  name: string;
}

export interface HomePageData {
  hero: HeroSlide[];
  shoulderTabs: ShoulderTab[];
  helpHeading: string;
  helpTabs: HelpTab[];
  testimonials: TestimonialItem[];
}

export interface BlogPost {
  title: string;
  description: string;
  url: string;
  publishedDate: string;
}
